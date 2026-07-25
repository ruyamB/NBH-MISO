import os
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
PERSIST_DIR = os.path.join(BASE_DIR, "db", "chroma_db")
ENV_PATH    = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_PATH, override=True)

print(f"Vector-store   : {PERSIST_DIR}")
print(f"API key loaded : {bool(os.getenv('GOOGLE_API_KEY'))}")

# ---------------------------------------------------------------------------
# Connect to the persisted ChromaDB
# ---------------------------------------------------------------------------
embedding_model = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    task_type="retrieval_query",   # "query" task type is correct for retrieval
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)

db = Chroma(
    persist_directory=PERSIST_DIR,
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"},
)

# ---------------------------------------------------------------------------
# Query — designed to exercise the Solana security knowledge base
#
# This query asks about a real vulnerability category present in the dataset
# (missing access control / authority validation in Anchor programs), so the
# retriever should surface several highly-relevant records.
# ---------------------------------------------------------------------------
query = (
"How can I fix these Solana Anchor security findings in `withdraw_funds`: missing explicit signer verification, unsafe raw arithmetic that may cause overflow or underflow, and missing program-owner validation for accounts? Please provide secure Anchor constraints and code-level fixes using `Signer`, checked arithmetic such as `checked_add`/`checked_sub`, and appropriate owner checks.")
retriever = db.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "k": 5,
        "score_threshold": 0.4,   # slightly relaxed to surface more context
    },
)

relevant_docs = retriever.invoke(query)

# ---------------------------------------------------------------------------
# Display results
# ---------------------------------------------------------------------------
SEPARATOR = "-" * 70

print(f"\n{'=' * 70}")
print(f"  Query: {query}")
print(f"{'=' * 70}")
print(f"\nRetrieved {len(relevant_docs)} relevant document(s).\n")

for i, doc in enumerate(relevant_docs, 1):
    m = doc.metadata
    print(SEPARATOR)
    print(f"[{i}] {m.get('vulnerability_id', '?')} — {m.get('vulnerability_name', '?')}")
    print(f"    Category : {m.get('category', '?')}")
    print(f"    Severity : {m.get('severity', '?')}")
    print(f"    File     : {m.get('source_file', '?')}")
    print(f"    Confidence: {m.get('confidence', '?')}")
    print(f"\n  Chunk content:\n")
    # Print the first 600 chars of the retrieved chunk
    print("  " + doc.page_content[:600].replace("\n", "\n  "))
    print()

print(SEPARATOR)
print("\n[Done] If relevant documents were retrieved, the RAG pipeline is working correctly.")