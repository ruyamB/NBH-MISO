# 🍜 MISO — Solana Smart Contract AI Auditor & RAG Auto-Patcher

> **Terminal-native Solana Rust smart contract security scanner and RAG-powered AI auto-patcher with an interactive web dashboard.**

---

## 📌 Overview

**MISO** (Miso Smart Inspector & Optimizer) is an end-to-end security auditing and remediation platform built specifically for **Solana & Anchor Rust smart contracts**. It bridges the gap between static rule-based analysis, Retrieval-Augmented Generation (RAG) powered by real Solana audit datasets, and interactive AI-driven code patching—all integrated directly into the developer's terminal workflow and synced with an interactive web dashboard.

---

## 🎯 The Problem It Solves

### 1. High Vulnerability Rates in Solana Smart Contracts
Solana smart contracts written in Rust/Anchor are prone to critical security vulnerabilities such as:
- **Missing Signer / Owner Checks**: Allowing unauthorized account access or fund draining.
- **Unconstrained Cross-Program Invocations (CPIs)**: Allowing arbitrary program execution.
- **PDA Bump Unvalidation**: Enabling spoofed Program Derived Addresses.
- **Unsafe Account Closing & Rent Exemption Flaws**: Exposing accounts to re-initialization attacks.
- **Unchecked Arithmetic**: Causing integer overflows/underflows.

### 2. Manual & Costly Security Audits
Traditional smart contract security audits are manual, expensive (ranging from tens to hundreds of thousands of dollars), and slow down rapid development iterations.

### 3. LLM Hallucinations in Code Remediation
While generic LLMs can suggest code, they frequently generate syntactically invalid Rust/Anchor code, fail to account for Anchor framework constraints (e.g. lifetime parameters, account validation macros), or break existing logic when patching.

### 4. Fragmented Developer Workflows
Existing tools either run only static analysis in CI/CD or operate as separate web interfaces. Developers lack a **terminal-native tool** that scans code locally, presents VS Code-style inline diffs, auto-applies verified patches with rollbacks, and security-gates deployments.

---

## 🔥 Key Features

- 🛡️ **Hybrid Audit Engine**: Combines 7 Solana-specific deterministic static security rules with semantic LLM inspection to calculate a weighted **Confidence Score** (`75% AI Score + 25% Static Score`).
- 🧠 **RAG-Powered AI Auto-Patcher**: Leverages ChromaDB vector embeddings trained on real Solana security audit datasets (`solana_security_audit_dataset.jsonl`) to retrieve relevant vulnerability contexts and generate precise Rust security patches.
- 🖥️ **VS Code-Style Terminal Diffs**: Interactive CLI prompt presenting side-by-side/inline unified diffs, auto-backup creation (`.bak`), interactive patch approval (`[A]pply`, `[S]kip`, `[V]iew`, `[M]anual`), and re-scanning.
- 🚪 **Security-Gated Deployment (`miso deploy`)**: Prevents deploying contracts to Solana devnet/mainnet if the security score drops below a configurable threshold (default: `90/100`).
- 📝 **Automated Audit Logs (`MISO.md`)**: Generates an append-only audit trail markdown file tracking scans, confidence scores, and historical vulnerability trends.
- 🌐 **MISO Hub & Web Platform**: Sleek React/Vite web application featuring 3D visualizers, live audit reporting, documentation, and Neon PostgreSQL database synchronization.

---

## ⚡ System Architecture

```
                                    +-----------------------+
                                    | Solana Rust Contracts |
                                    +-----------+-----------+
                                                |
                                                v
                                   +-------------------------+
                                   |  MISO Hybrid Scan Engine|
                                   |  - 7 Static Rules Parser|
                                   |  - LLM Semantic Scanner |
                                   +------------+------------+
                                                |
                                                v
                                    +-----------------------+
                                    | Weighted Audit Score  |
                                    |       & Findings      |
                                    +-----------+-----------+
                                                |
                                                v
                                   +-------------------------+
                                   |  RAG Query & Retrieval  |
                                   |  (ChromaDB + Gemini)    |
                                   +------------+------------+
                                                |
                                                v
                                   +-------------------------+
                                   |   MISO AI Patch Generator|
                                   +------------+------------+
                                                |
                                                v
                                   +-------------------------+
                                   | Terminal Interactive Diff|
                                   |   ([A]pply / [S]kip)    |
                                   +------------+------------+
                                                |
                                                v
                                   +-------------------------+
                                   | Solana Devnet Deploy    |
                                   | (Security Gated > 90)   |
                                   +-------------------------+
```

---

## 🚧 Challenges We Ran Into & Solutions

### 1. LLM Syntax Hallucinations in Anchor Rust Patches
- **Challenge**: Standard LLMs often fail to generate syntactically correct Anchor Rust code—frequently omitting lifetime parameters (e.g. `Context<Withdraw<'_>>`), breaking Anchor macro expansions, or introducing ownership/borrow checker errors.
- **Solution**: We implemented a RAG pipeline using ChromaDB populated with real-world Solana security audit cases. We engineered specialized prompt templates (`miso_patch_prompt.txt`) that instruct the LLM to output precise line-by-line diffs with strict Anchor syntax rules, and integrated AST-level validations before surfacing patches to developers.

### 2. Cross-Language Bridge (Node.js CLI to Python RAG Pipeline)
- **Challenge**: Node.js is great for fast terminal CLIs and interactive menus, but Python is the standard ecosystem for vector stores (ChromaDB, LangChain). Running a heavy persistent Python daemon for a fast CLI tool was impractical.
- **Solution**: Built an asynchronous, lightweight JSON-over-stdio IPC subprocess bridge (`ragBridge.js` $\leftrightarrow$ `retrieval.py`). The CLI executes python RAG retrieval on demand only during `miso patch`, keeping all other CLI operations ultra-fast and independent.

### 3. Deterministic vs. Non-Deterministic Scoring Alignment
- **Challenge**: Relying solely on static regex/AST parsing leads to high false positives, while relying purely on LLM scoring causes score variance between runs.
- **Solution**: Designed a hybrid scoring formula combining deterministic static AST rule evaluations (25% weight) with deep LLM semantic code analysis (75% weight), bounded by a margin metric. This creates consistent, repeatable confidence scores ranging from 0–100.

### 4. Safe In-Place File Patching & Rollbacks
- **Challenge**: Automatically modifying developer Rust source code in-place carries high risk of accidental code loss or unwanted changes.
- **Solution**: Developed a fail-safe patch applicator (`patchApplicator.js`) that automatically creates timestamped backups (`.bak`) before any mutation, verifies file target ranges, allows instant rollbacks, and provides interactive diff preview screens.

### 5. Multi-Tiered API Provider Management
- **Challenge**: Rate limits and key management across Google Gemini and Groq LLMs.
- **Solution**: Created a centralized provider client (`llmClient.js` & `config.js`) supporting hot-swappable providers, environment variable fallbacks, and CLI key management (`miso provider-gsk_...`).

---

## 🛡️ Solana Security Rules Covered

| Rule ID | Severity | Description |
|---|---|---|
| `MISSING_SIGNER_CHECK` | 🔴 Critical | Accounts modified without verifying `is_signer` flag |
| `MISSING_OWNERSHIP_CHECK` | 🔴 Critical | Account owner constraint missing (untrusted account data) |
| `PDA_BUMP_UNVALIDATED` | 🟠 High | Using unverified PDA bump seeds instead of canonical bump |
| `UNCONSTRAINED_CPI` | 🟠 High | Invoking target program via CPI without verifying program ID |
| `UNSAFE_ACCOUNT_CLOSE` | 🟠 High | Closing accounts without zeroing data or clearing lamports |
| `UNCHECKED_ARITHMETIC` | 🟡 Medium | Raw arithmetic operations prone to overflow/underflow |
| `MISSING_RENT_EXEMPTION` | 🟡 Medium | Account initialization missing explicit rent-exemption checks |

---

## 📦 Project Structure

```
miso-cli/
├── miso-cli/                        ← Terminal-native CLI Application
│   ├── bin/miso.js                  ← Executable entry point
│   ├── src/
│   │   ├── cli/                     ← Commands (scan, patch, deploy, save, history)
│   │   ├── engine/                  ← AST parser & 7 static Solana security rules
│   │   ├── rag/                     ← RAG bridge connecting Node.js to Python
│   │   ├── llm/                     ← Prompt engineering & API client (Gemini/Groq)
│   │   └── utils/                   ← Interactive terminal diff & patch applicator
│   └── rag/                         ← Python ChromaDB vector store & ingestion pipeline
├── miso - front/                    ← Web Frontend & API Hub
│   ├── src/                         ← React 19 + Vite + TailwindCSS + Three.js
│   ├── server.js                    ← Express backend with PostgreSQL integration
│   └── public/                      ← Static assets
├── MISO.md                          ← Automated audit log generated by scans
└── README.md                        ← Root documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **Python**: v3.10+ (for RAG vector search during `miso patch`)
- **API Key**: Google Gemini API key or Groq API key

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/ruyamB/NBH-MISO.git
cd NBH-MISO

# Install CLI dependencies
cd miso-cli
npm install

# Install Frontend dependencies
cd "../miso - front"
npm install
```

### 2. Configuration & RAG Setup

```bash
cd miso-cli

# Set your API key
miso provider-AIzaSy...   # Google Gemini key
# or: miso provider-gsk_... # Groq key

# Build RAG knowledge base (one-time ingestion)
npm run rag:ingest
```

---

## 🛠️ Usage

### CLI Commands

```bash
# Scan Rust contracts in workspace
node bin/miso.js scan

# Scan specific contract
node bin/miso.js scan --file programs/vault/src/lib.rs

# Run RAG-powered AI auto-patcher with interactive diffs
node bin/miso.js patch

# Security-gated devnet deployment (requires score >= threshold)
node bin/miso.js deploy

# Sync audit snapshot to database
node bin/miso.js save

# View audit history
node bin/miso.js history
```

### Running the Web Dashboard

```bash
cd "miso - front"
npm run dev
```

Open `http://localhost:5173` to explore the interactive dashboard, documentation, and audit history visualizer.

---
