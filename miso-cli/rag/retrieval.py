#!/usr/bin/env python3
"""
MISO RAG Retrieval Bridge — CLI Mode
=====================================
Called by Node.js ragBridge.js as a subprocess.
Accepts --query "..." argument, retrieves relevant docs from ChromaDB,
and prints results as JSON to stdout.

Usage:
  python rag/retrieval.py --query "..." [--k 5] [--threshold 0.4]
"""

import os
import sys
import json
import argparse
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration — paths relative to THIS file so the project is portable
# ---------------------------------------------------------------------------
SCRIPT_DIR  = Path(__file__).parent.resolve()
PERSIST_DIR = SCRIPT_DIR / "db" / "chroma_db"
ENV_PATH    = SCRIPT_DIR.parent / ".env"

# Load .env manually (avoid requiring python-dotenv if not installed)
def load_env(env_path):
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
# Argument parsing
# ---------------------------------------------------------------------------
parser = argparse.ArgumentParser(description="MISO RAG Retrieval Bridge")
parser.add_argument("--query", required=True, help="Natural language query string")
parser.add_argument("--k", type=int, default=5, help="Number of results to retrieve")
parser.add_argument("--threshold", type=float, default=0.4, help="Similarity score threshold")
args = parser.parse_args()

# ---------------------------------------------------------------------------
# Check vector store exists
# ---------------------------------------------------------------------------
if not PERSIST_DIR.exists():
    error = {
        "error": "chroma_db_not_found",
        "message": f"ChromaDB not found at {PERSIST_DIR}. Run: npm run rag:ingest",
        "docs": []
    }
    print(json.dumps(error))
    sys.exit(0)

api_key = os.getenv("GOOGLE_API_KEY", "")
if not api_key:
    error = {
        "error": "missing_api_key",
        "message": "GOOGLE_API_KEY not set. Add it to your .env file.",
        "docs": []
    }
    print(json.dumps(error))
    sys.exit(0)

# ---------------------------------------------------------------------------
# Lazy imports — only load heavy deps after validation
# ---------------------------------------------------------------------------
try:
    from langchain_chroma import Chroma
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
except ImportError as e:
    error = {
        "error": "missing_python_deps",
        "message": f"Missing Python dependency: {e}. Run: pip install langchain-chroma langchain-google-genai",
        "docs": []
    }
    print(json.dumps(error))
    sys.exit(0)

# ---------------------------------------------------------------------------
# Connect to ChromaDB and retrieve
# ---------------------------------------------------------------------------
try:
    embedding_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        task_type="retrieval_query",
        google_api_key=api_key,
    )

    db = Chroma(
        persist_directory=str(PERSIST_DIR),
        embedding_function=embedding_model,
        collection_metadata={"hnsw:space": "cosine"},
    )

    retriever = db.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"k": args.k, "score_threshold": args.threshold},
    )

    relevant_docs = retriever.invoke(args.query)

    # Serialize to JSON-safe structure
    output = []
    for doc in relevant_docs:
        output.append({
            "page_content": doc.page_content,
            "metadata": {
                "vulnerability_id":   doc.metadata.get("vulnerability_id", ""),
                "vulnerability_name": doc.metadata.get("vulnerability_name", ""),
                "category":           doc.metadata.get("category", ""),
                "severity":           doc.metadata.get("severity", ""),
                "source_file":        doc.metadata.get("source_file", ""),
                "confidence":         doc.metadata.get("confidence", ""),
            }
        })

    print(json.dumps({"docs": output, "count": len(output)}))

except Exception as e:
    error = {
        "error": "retrieval_failed",
        "message": str(e),
        "docs": []
    }
    print(json.dumps(error))
    sys.exit(0)
