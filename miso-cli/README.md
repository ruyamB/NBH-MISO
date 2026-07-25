# MISO CLI v2

> Terminal-native Solana Rust smart-contract auditor with RAG-powered MISO AI auto-patcher.

```
User Contract → MISO Rule Engine → Detected Vulnerability
→ AI Natural-Language Query → ChromaDB RAG Retrieval
→ MISO AI LLM Patch Prompt → Suggested Patch
→ Terminal Diff (VS Code-style) → Developer Approval
→ Apply Patch → Re-scan
```

---

## Quick Start

```bash
# 1. Install
cd miso-cli
npm install

# 2. Set API key (.env file OR inline)
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=AIzaSy...

# 3. Build the RAG vector store (once)
npm run rag:ingest
# or: python rag/ingestion_pipeline.py

# 4. Run MISO
node bin/miso.js scan            # Scan your Solana contracts
node bin/miso.js patch           # AI auto-patcher with VS Code-style suggestions
node bin/miso.js help            # Full command list
```

---

## Commands

| Command | Description |
|---|---|
| `miso scan` | Static + AI scan of Rust contracts → `MISO.md` |
| `miso scan --file <path>` | Scan specific file(s) |
| `miso patch` | **RAG-powered MISO AI auto-patcher** |
| `miso patch --file <path>` | Patch specific file(s) |
| `miso deploy` | Security-gated deploy to Solana devnet |
| `miso deploy --force` | Bypass threshold |
| `miso save` | Sync audit snapshot to MISO Hub |
| `miso provider-<key>` | Set Groq (`gsk_...`) or Gemini (`AIza...`) API key |
| `miso config` | View MISO settings |
| `miso config threshold <n>` | Set deploy threshold (0–100) |
| `miso history` | Show scan history from `MISO.md` |
| `miso usage` | Show token consumption |
| `miso revoke` | Wipe all local MISO config and history |
| `miso --version` | Print version |

---

## `miso patch` — VS Code-Style Terminal Suggestions

When you run `miso patch`, MISO processes each **Medium / High / Critical** vulnerability through the full pipeline:

```
╭──────────────────────────────────────────────────────────────────╮
│  🔴 MISO AI  ·  MISSING_SIGNER_CHECK  ·  Critical  [1/3]        │
╰──────────────────────────────────────────────────────────────────╯
  📍  programs/vault/src/lib.rs:42
  ✅  Status: CORRECTION AVAILABLE

  ─── Explanation ────────────────────────────────────────────────
  The withdraw_funds instruction modifies mutable accounts but
  lacks an explicit signer check. Any caller can execute it.

  ─── Suggested Patch ─────────────────────────────────────────────
    40 │   pub fn withdraw_funds(
  - 41 │     ctx: Context<Withdraw>,
  + 41 │     ctx: Context<Withdraw<'_>>,
  + 42 │     require!(ctx.accounts.authority.is_signer, MisoError::Unauthorized);
    43 │   ) -> Result<()> {

  ─── Correction Explanation ───────────────────────────────────────
  Adding require! ensures the authority account is a signer before
  any state mutation occurs.

  ✔ Verification: Run cargo check  ·  Run cargo test  ·  MISO scan
  ──────────────────────────────────────────────────────────────────

  What would you like to do with this MISO AI suggestion?
  Use ↑/↓ arrows · Enter to confirm · Ctrl+C to abort

  ❯ [A] Apply patch to lib.rs
    [S] Skip this finding
    [V] View full corrected file
    [M] Flag for manual review
    [Q] Quit patching session
```

---

## Architecture

```
miso-cli/
├── bin/miso.js                      ← CLI entry point
├── src/
│   ├── cli/
│   │   ├── index.js                 ← Command router
│   │   ├── scan.js                  ← miso scan
│   │   ├── deploy.js                ← miso deploy
│   │   ├── save.js                  ← miso save
│   │   └── patch.js                 ← miso patch (orchestrator)
│   ├── engine/
│   │   ├── parser.js                ← Rust AST/tokenizer
│   │   ├── rules.js                 ← 7 Solana security rules
│   │   ├── engine.js                ← Static + AI scan runner
│   │   └── discovery.js             ← Rust file discovery
│   ├── rag/
│   │   ├── queryBuilder.js          ← Findings → NL query
│   │   └── ragBridge.js             ← Node → Python subprocess bridge
│   ├── llm/
│   │   ├── promptTemplate.js        ← MISO AI prompt builder
│   │   ├── llmClient.js             ← Gemini/Groq API client
│   │   └── responseParser.js        ← JSON response parser
│   ├── utils/
│   │   ├── diffRenderer.js          ← VS Code-style terminal diff
│   │   ├── patchApplicator.js       ← Apply patch + backup
│   │   ├── interactiveMenu.js       ← Arrow-key menus
│   │   └── logger.js                ← MISO.md + terminal output
│   ├── ai/
│   │   ├── scanner.js               ← Gemini/Groq scan API
│   │   └── prompts.js               ← Scan system prompts
│   ├── learning/                    ← Self-learning knowledge DB
│   ├── db.js                        ← Neon PostgreSQL
│   └── config.js                    ← Settings + API key management
├── rag/
│   ├── retrieval.py                 ← Python RAG bridge (CLI mode)
│   ├── ingestion_pipeline.py        ← Build ChromaDB vector store
│   └── db/chroma_db/                ← Embedded vector store
├── templates/prompts/
│   └── miso_patch_prompt.txt        ← MISO AI patch prompt
└── solana_security_audit_dataset.jsonl
```

---

## Prerequisites

### Node.js
- Node.js 18+
- `npm install` from `miso-cli/`

### Python (for RAG)
```bash
pip install langchain-chroma langchain-google-genai langchain-text-splitters langchain-core
```

Python 3.10+ required. The RAG bridge is only used during `miso patch`. All other commands work without Python.

### API Keys
| Key | Used For |
|---|---|
| `GOOGLE_API_KEY` | Gemini embeddings (RAG) + MISO AI patches |
| `GEMINI_API_KEY` | Alternative Gemini key |
| `GROQ_API_KEY` | Groq LLM (faster, free tier) |

Set in `.env` or with `miso provider-AIzaSy...` / `miso provider-gsk_...`

---

## Build the Vector Store

Before using `miso patch`, build the ChromaDB knowledge base:

```bash
npm run rag:ingest
```

This reads `solana_security_audit_dataset.jsonl`, embeds it using Gemini, and stores it in `rag/db/chroma_db/`.  
**One-time operation** (~5–10 min depending on dataset size and Gemini rate limits).

The existing `test-rag-main/db/chroma_db/` can be copied directly:
```
xcopy /E /I ..\test-rag-main\db\chroma_db rag\db\chroma_db
```

---

## Security Rules

MISO detects **7 classes** of Solana/Anchor vulnerabilities:

| Rule ID | Severity | Description |
|---|---|---|
| `MISSING_SIGNER_CHECK` | Critical | Mutable account without signer validation |
| `MISSING_OWNERSHIP_CHECK` | Critical | Account owner not verified |
| `PDA_BUMP_UNVALIDATED` | High | PDA bump seed not canonical |
| `UNCONSTRAINED_CPI` | High | CPI without program ID validation |
| `UNSAFE_ACCOUNT_CLOSE` | High | Account closed without clearing data |
| `UNCHECKED_ARITHMETIC` | Medium | Raw arithmetic (overflow/underflow) |
| `MISSING_RENT_EXEMPTION` | Medium | Account init without rent check |

---

## Score System

```
Confidence Score = 75% AI Score + 25% Static Score ± margin
```

- **90–100** 🟢 Ready for deployment
- **50–89**  🟡 Review findings before deploy  
- **0–49**   🔴 Critical issues — blocked from deploy

---

## MISO.md Audit Trail

Every scan appends a timestamped entry to `MISO.md`:

```markdown
## Run — 2026-07-25 10:30 UTC
**Confidence Score:** 72/100
**Files Scanned:** programs/vault/src/lib.rs

### Findings
- 🔴 **Critical** — Missing signer check (lib.rs:42)
```

---

## License

ISC © ruyam
