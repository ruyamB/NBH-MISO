import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SYSTEM_PROMPT = `You are MISO AI, an expert Solana Rust smart contract auditor.
Your job is to analyze Rust source code for Solana/Anchor smart contracts and identify security vulnerabilities, logical flaws, missing signer checks, integer overflows, reentrancy vulnerabilities, PDA validation flaws, and unsafe account closures.

Always respond ONLY with valid JSON in the following format:
{
  "aiScore": <number from 0 to 100 representing security confidence level>,
  "summary": "<short audit summary>",
  "findings": [
    {
      "severity": "Critical" | "High" | "Medium" | "Low" | "Info",
      "file": "<filename>",
      "line": <line number or 1>,
      "details": "<clear explanation of vulnerability>",
      "recommendation": "<suggested code fix>"
    }
  ]
}`;

export const DEFAULT_INSTRUCTIONS = `Analyze the provided smart contract code thoroughly against known Solana security best practices.
Evaluate the code for proper account validation, signer checks, owner checks, arithmetic safety, and constraint verification.
Assign an overall aiScore from 0 (very dangerous) to 100 (fully secure). If minor or no issues are found, score should be high (85-100). If critical vulnerabilities exist (e.g. missing signer checks on mutable accounts), deduct score accordingly.`;

export const DEFAULT_RULES = `1. MISSING_SIGNER_CHECK: Verify all instruction handlers requiring authority/signatures enforce Signer account types or explicit Signer checks.
2. MISSING_OWNERSHIP_CHECK: Verify accounts are checked for owner program ID matching.
3. UNCHECKED_ARITHMETIC: Check for raw math operations (+, -, *) without checked_add/checked_sub or Anchor safety constraints.
4. UNBOUNDED_ACCOUNT_SIZE: Check account initialization for proper size limits.
5. PDA_BUMP_SEED_VALIDATION: Ensure canonical bump validation.
6. ARBITRARY_CPI: Validate CPI program target.
7. UNSAFE_ACCOUNT_CLOSING: Ensure lamports are cleared and account discriminator modified on close.`;

export function loadPromptContext() {
  const baseDir = path.join(process.cwd(), '.miso', 'prompts');
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let instructions = DEFAULT_INSTRUCTIONS;
  let rules = DEFAULT_RULES;

  const sysPath = path.join(baseDir, 'system_prompt.txt');
  const instPath = path.join(baseDir, 'instructions.txt');
  const rulesPath = path.join(baseDir, 'rules.txt');

  if (fs.existsSync(sysPath)) { const c = fs.readFileSync(sysPath, 'utf8').trim(); if (c) systemPrompt = c; }
  if (fs.existsSync(instPath)) { const c = fs.readFileSync(instPath, 'utf8').trim(); if (c) instructions = c; }
  if (fs.existsSync(rulesPath)) { const c = fs.readFileSync(rulesPath, 'utf8').trim(); if (c) rules = c; }

  return {
    systemPrompt,
    instructions,
    rules,
    combinedMemory: `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== INSTRUCTIONS ===\n${instructions}\n\n=== RULES ===\n${rules}`
  };
}
