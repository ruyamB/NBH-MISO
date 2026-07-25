#!/usr/bin/env python3
"""
MISO RAG Ingestion Pipeline
============================
Ingests the solana_security_audit_dataset.jsonl knowledge base into
a local ChromaDB vector store using Gemini embeddings.

Run this once (or when the dataset is updated):
  python rag/ingestion_pipeline.py

Or via npm:
  npm run rag:ingest
"""

import os
import json
import shutil
import time
import re
from pathlib import Path
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

# ---------------------------------------------------------------------------
# Configuration — all paths relative to THIS file so the project is portable
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent

# Dataset can live at project root OR in the rag/ folder
DATASET_CANDIDATES = [
    PROJECT_ROOT / "solana_security_audit_dataset.jsonl",
    SCRIPT_DIR   / "solana_security_audit_dataset.jsonl",
]

PERSIST_DIR = SCRIPT_DIR / "db" / "chroma_db"
ENV_PATH    = PROJECT_ROOT / ".env"


# ---------------------------------------------------------------------------
# Load .env manually (avoid requiring python-dotenv if not installed)
# ---------------------------------------------------------------------------
def load_env(env_path: Path):
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

load_env(ENV_PATH)


# ---------------------------------------------------------------------------
# Step 1 – Load & convert JSONL records to LangChain Documents
# ---------------------------------------------------------------------------
def load_documents() -> list[Document]:
    dataset_path = None
    for candidate in DATASET_CANDIDATES:
        if candidate.exists():
            dataset_path = candidate
            break

    if dataset_path is None:
        raise FileNotFoundError(
            "Dataset not found. Expected at:\n"
            + "\n".join(f"  {p}" for p in DATASET_CANDIDATES)
            + "\n\nPlease copy solana_security_audit_dataset.jsonl to the miso-cli/ directory."
        )

    print(f"\n[1/3] Loading dataset from: {dataset_path}")
    documents: list[Document] = []
    skipped = 0

    with open(dataset_path, encoding="utf-8") as fh:
        for line_no, raw_line in enumerate(fh, start=1):
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                rec = json.loads(raw_line)
            except json.JSONDecodeError as exc:
                print(f"  [WARN] Line {line_no}: JSON parse error — {exc}. Skipping.")
                skipped += 1
                continue

            if rec.get("severity") == "N/A":
                skipped += 1
                continue

            content_parts = [
                f"Vulnerability ID  : {rec.get('vulnerability_id', 'N/A')}",
                f"Vulnerability Name: {rec.get('vulnerability_name', 'N/A')}",
                f"Category          : {rec.get('category', 'N/A')}",
                f"Severity          : {rec.get('severity', 'N/A')}",
                f"Source File       : {rec.get('source_file', 'N/A')}",
                f"Confidence        : {rec.get('confidence', 'N/A')}",
                f"Artificially Gen  : {rec.get('artificially_generated', False)}",
                "",
                f"Explanation:\n{rec.get('vulnerability_explanation', '')}",
                "",
                f"Security Impact:\n{rec.get('security_impact', '')}",
                "",
                f"Correction:\n{rec.get('correction_explanation', '')}",
                "",
                f"Detection Pattern:\n{rec.get('detection_pattern', '')}",
                "",
                f"Secure Pattern:\n{rec.get('secure_pattern', '')}",
                "",
                f"Solana / Anchor Concept:\n{rec.get('relevant_solana_or_anchor_concept', '')}",
            ]

            metadata = {
                "vulnerability_id"  : rec.get("vulnerability_id", ""),
                "vulnerability_name": rec.get("vulnerability_name", ""),
                "category"          : rec.get("category", ""),
                "severity"          : rec.get("severity", ""),
                "source_file"       : rec.get("source_file", ""),
                "confidence"        : rec.get("confidence", ""),
                "artificially_generated": str(rec.get("artificially_generated", False)),
            }

            documents.append(Document(page_content="\n".join(content_parts), metadata=metadata))

    print(f"  Loaded  : {len(documents)} document(s)")
    print(f"  Skipped : {skipped} record(s) (secure-reference / parse errors)")
    return documents


# ---------------------------------------------------------------------------
# Step 2 – Chunk documents
# ---------------------------------------------------------------------------
def split_documents(documents: list[Document], chunk_size: int = 800, chunk_overlap: int = 150) -> list[Document]:
    print(f"\n[2/3] Splitting (chunk_size={chunk_size}, overlap={chunk_overlap})...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", ", ", " "],
    )
    chunks = splitter.split_documents(documents)
    print(f"  Created {len(chunks)} chunk(s)")
    for i, chunk in enumerate(chunks[:3]):
        vid = chunk.metadata.get("vulnerability_id", "?")
        print(f"\n  --- Chunk {i+1} preview [{vid}] ---")
        print(f"  Length : {len(chunk.page_content)} chars")
        print(f"  Text   : {chunk.page_content[:120].strip()}...")
    if len(chunks) > 3:
        print(f"\n  ... and {len(chunks) - 3} more chunk(s).")
    return chunks


# ---------------------------------------------------------------------------
# Step 3 – Build the vector store
# ---------------------------------------------------------------------------
def create_vector_store(chunks: list[Document], batch_size: int = 50) -> Chroma:
    print(f"\n[3/3] Building vector store at: {PERSIST_DIR}")
    print(f"  Processing {len(chunks)} chunks in batches of {batch_size} (with rate-limit handling)...")

    if PERSIST_DIR.exists():
        print("  Existing vector store detected — removing and rebuilding...")
        shutil.rmtree(PERSIST_DIR)
    PERSIST_DIR.mkdir(parents=True, exist_ok=True)

    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise EnvironmentError("GOOGLE_API_KEY not set. Add it to your .env file.")

    embedding_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        task_type="retrieval_document",
        google_api_key=api_key,
    )

    vectorstore = None

    for batch_start in range(0, len(chunks), batch_size):
        batch = chunks[batch_start: batch_start + batch_size]
        batch_num     = batch_start // batch_size + 1
        total_batches = (len(chunks) + batch_size - 1) // batch_size
        print(f"  Embedding batch {batch_num}/{total_batches} "
              f"(chunks {batch_start + 1}–{batch_start + len(batch)})...", end=" ", flush=True)

        max_retries = 6
        for attempt in range(max_retries):
            try:
                if vectorstore is None:
                    vectorstore = Chroma.from_documents(
                        documents=batch,
                        embedding=embedding_model,
                        persist_directory=str(PERSIST_DIR),
                        collection_metadata={"hnsw:space": "cosine"},
                    )
                else:
                    vectorstore.add_documents(batch)
                print("done")
                break
            except Exception as exc:
                error_str = str(exc)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    wait = 65 * (2 ** attempt)
                    match = re.search(r"retry[^:]*:\s*'?(\d+)s", error_str, re.IGNORECASE)
                    if match:
                        wait = int(match.group(1)) + 5
                    print(f"\n  [Rate limit] Waiting {wait}s (attempt {attempt + 1}/{max_retries})...")
                    time.sleep(wait)
                else:
                    raise

        if batch_start + batch_size < len(chunks):
            time.sleep(2)

    if vectorstore is None:
        raise RuntimeError("No chunks were embedded — check the dataset and API key.")

    doc_count = vectorstore._collection.count()
    print(f"\n  Vector store created — {doc_count} vectors stored.")
    print(f"  Persisted to: {PERSIST_DIR}")
    return vectorstore


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("  MISO RAG Ingestion Pipeline — Solana Security Audit Dataset")
    print("=" * 60)
    documents = load_documents()
    chunks    = split_documents(documents)
    create_vector_store(chunks)
    print("\n" + "=" * 60)
    print("  Ingestion complete! Run `miso patch` to use the knowledge base.")
    print("=" * 60)


if __name__ == "__main__":
    main()
