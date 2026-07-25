import os
import json
import shutil
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration — all paths are relative to THIS file so the project is
# fully portable across machines.
# ---------------------------------------------------------------------------
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "solana_security_audit_dataset.jsonl")
PERSIST_DIR  = os.path.join(BASE_DIR, "db", "chroma_db")
ENV_PATH     = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_PATH, override=True)

print(f"Project root   : {BASE_DIR}")
print(f"Dataset file   : {DATASET_PATH}")
print(f"Vector-store   : {PERSIST_DIR}")
print(f".env found     : {os.path.exists(ENV_PATH)}")
print(f"API key loaded : {bool(os.getenv('GOOGLE_API_KEY'))}")


# ---------------------------------------------------------------------------
# Step 1 – Load & convert JSONL records to LangChain Documents
# ---------------------------------------------------------------------------
def load_documents(dataset_path: str = DATASET_PATH) -> list[Document]:
    """
    Parse the Solana security audit JSONL dataset.

    Each JSON record is converted into a single LangChain Document whose
    page_content is a structured plain-text summary of the most semantically
    rich fields.  Code snippets are intentionally kept short to avoid
    drowning out the conceptual signal during embedding.
    """
    print(f"\n[1/3] Loading dataset from: {dataset_path}")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(
            f"Dataset not found at '{dataset_path}'.\n"
            "Please copy solana_security_audit_dataset.jsonl into the project root."
        )

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

            # Skip "secure reference" placeholders that carry no vulnerability
            if rec.get("severity") == "N/A":
                skipped += 1
                continue

            # Build a rich, human-readable page_content from key fields
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

            page_content = "\n".join(content_parts)

            metadata = {
                "vulnerability_id"  : rec.get("vulnerability_id", ""),
                "vulnerability_name": rec.get("vulnerability_name", ""),
                "category"          : rec.get("category", ""),
                "severity"          : rec.get("severity", ""),
                "source_file"       : rec.get("source_file", ""),
                "confidence"        : rec.get("confidence", ""),
                "artificially_generated": str(rec.get("artificially_generated", False)),
            }

            documents.append(Document(page_content=page_content, metadata=metadata))

    print(f"  Loaded  : {len(documents)} document(s)")
    print(f"  Skipped : {skipped} record(s) (secure-reference / parse errors)")
    return documents


# ---------------------------------------------------------------------------
# Step 2 – Chunk documents
# ---------------------------------------------------------------------------
def split_documents(
    documents: list[Document],
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> list[Document]:
    """Split documents into overlapping chunks suitable for embedding."""
    print(f"\n[2/3] Splitting (chunk_size={chunk_size}, overlap={chunk_overlap})...")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", ", ", " "],
    )
    chunks = splitter.split_documents(documents)
    print(f"  Created {len(chunks)} chunk(s)")

    # Show a brief preview of the first 3 chunks
    for i, chunk in enumerate(chunks[:3]):
        vid = chunk.metadata.get("vulnerability_id", "?")
        print(f"\n  --- Chunk {i+1} preview [{vid}] ---")
        print(f"  Length : {len(chunk.page_content)} chars")
        print(f"  Text   : {chunk.page_content[:120].strip()}...")

    if len(chunks) > 3:
        print(f"\n  ... and {len(chunks) - 3} more chunk(s).")

    return chunks


# ---------------------------------------------------------------------------
# Step 3 – Build / rebuild the vector store
# ---------------------------------------------------------------------------
def create_vector_store(
    chunks: list[Document],
    persist_directory: str = PERSIST_DIR,
    batch_size: int = 50,
) -> Chroma:
    """
    Embed chunks with Gemini and persist to ChromaDB (rebuilt each run).

    Chunks are processed in small batches with a short pause between batches
    to stay within the Gemini free-tier rate limit (100 embed requests/min).
    429 RESOURCE_EXHAUSTED errors are handled with automatic exponential
    back-off so the pipeline survives without crashing.
    """
    import time

    print(f"\n[3/3] Building vector store at: {persist_directory}")
    print(f"  Processing {len(chunks)} chunks in batches of {batch_size} "
          "(with rate-limit handling)...")

    # Always rebuild from scratch so the store stays consistent with the dataset
    if os.path.exists(persist_directory):
        print("  Existing vector store detected — removing and rebuilding...")
        shutil.rmtree(persist_directory)
    os.makedirs(persist_directory, exist_ok=True)

    embedding_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        task_type="retrieval_document",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    vectorstore: Chroma | None = None

    for batch_start in range(0, len(chunks), batch_size):
        batch = chunks[batch_start : batch_start + batch_size]
        batch_num = batch_start // batch_size + 1
        total_batches = (len(chunks) + batch_size - 1) // batch_size
        print(f"  Embedding batch {batch_num}/{total_batches} "
              f"(chunks {batch_start + 1}–{batch_start + len(batch)})...", end=" ", flush=True)

        max_retries = 6
        for attempt in range(max_retries):
            try:
                if vectorstore is None:
                    # First batch: create the collection
                    vectorstore = Chroma.from_documents(
                        documents=batch,
                        embedding=embedding_model,
                        persist_directory=persist_directory,
                        collection_metadata={"hnsw:space": "cosine"},
                    )
                else:
                    # Subsequent batches: add to existing collection
                    vectorstore.add_documents(batch)
                print("done")
                break  # success — exit retry loop

            except Exception as exc:
                error_str = str(exc)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    # Extract suggested retry delay if present
                    wait = 65 * (2 ** attempt)  # exponential back-off: 65s, 130s, …
                    import re
                    match = re.search(r"retry[^:]*:\s*'?(\d+)s", error_str, re.IGNORECASE)
                    if match:
                        wait = int(match.group(1)) + 5  # honour the server's suggestion
                    print(f"\n  [Rate limit] Waiting {wait}s before retry "
                          f"(attempt {attempt + 1}/{max_retries})...")
                    time.sleep(wait)
                else:
                    raise  # non-quota error — propagate immediately

        # Small courtesy pause between successful batches to avoid burst spikes
        if batch_start + batch_size < len(chunks):
            time.sleep(2)

    if vectorstore is None:
        raise RuntimeError("No chunks were embedded — check the dataset and API key.")

    doc_count = vectorstore._collection.count()
    print(f"\n  Vector store created — {doc_count} vectors stored.")
    print(f"  Persisted to: {persist_directory}")
    return vectorstore



# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("  RAG Ingestion Pipeline — Solana Security Audit Dataset")
    print("=" * 60)

    documents = load_documents()
    chunks    = split_documents(documents)
    create_vector_store(chunks)

    print("\n" + "=" * 60)
    print("  Ingestion complete! Run retreval_pipeline.py to query.")
    print("=" * 60)


if __name__ == "__main__":
    main()