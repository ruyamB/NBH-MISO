## Run — 2026-07-25 16:53 UTC
**Confidence Score:** 75/100
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** cli component/tests/fixtures/onecon.rs, cli component/tests/fixtures/secure.rs, cli component/tests/fixtures/test-evening.rs, cli component/tests/fixtures/vulnerable.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (cli component/tests/fixtures/onecon.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 17:01 UTC
**Confidence Score:** 93/100 (↑ +18 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: -0.9%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [AI] — The contract has a critical vulnerability due to the lack of proper account validation and signer checks. (vulnerable.rs:1)
- 🟠 **High** [AI] — The contract does not have explicit owner checks for some accounts, which could lead to unauthorized access. (onecon.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in some areas, but it is handled properly in the withdraw function. (onecon.rs:1)
- 🔵 **Low** [AI] — The contract does not have any obvious security vulnerabilities, but it is always a good practice to review the code thoroughly. (secure.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 17:05 UTC
**Confidence Score:** 96/100 (↑ +3 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: +2.4%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The contract is missing a signer check on the vault account, which could allow unauthorized access to the account. (vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function, but it is wrapped in a require statement to prevent overflows. (onecon.rs:1)
- 🔵 **Low** [AI] — The contract uses a close constraint on the vault account, but it does not explicitly check if the account is rent-exempt before closing it. (secure.rs:1)
- 🔵 **Info** [AI] — The contract has a potential issue with the vault owner constraint, as it is set to the system program ID, which may not be the intended behavior. (vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 17:07 UTC
**Confidence Score:** 92/100 (↓ -4 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: -1.8%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The contract has a vulnerable withdraw function that does not check if the signer is the owner of the vault, which could lead to unauthorized withdrawals. (vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function, but it does use the checked_add and checked_sub functions which prevents potential overflows. (onecon.rs:1)
- 🔵 **Low** [AI] — The contract does not have any explicit error handling for the CPI transfer instruction. (onecon.rs:1)
- 🔵 **Info** [AI] — The contract uses checked arithmetic and Anchor's native close constraint, which is a good practice. (secure.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 17:07 UTC
**Confidence Score:** 84/100 (↓ -8 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: -1.2%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The contract lacks explicit signer checks for the 'signer' account, which could lead to unauthorized access. (vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add or checked_sub, which could lead to potential overflows. (vulnerable.rs:1)
- 🔵 **Info** [AI] — The contract has a constraint check for the vault owner, which is a good practice. (vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 17:08 UTC
**Confidence Score:** 85/100 (↑ +1 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: +0.4%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function, which may lead to potential overflows. (vulnerable.rs:1)
- 🔵 **Low** [AI] — Although the contract has a signer account, it does not explicitly check for the signer in the withdraw function, which may lead to unauthorized access. (vulnerable.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 18:03 UTC
**Confidence Score:** 93/100 (↑ +8 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: -0.7%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function, but it is properly handled with require statements. (onecon.rs:1)
- 🔵 **Low** [AI] — The contract uses a CPI to invoke another program, but it does not validate the program ID. However, the program ID is hardcoded and seems to be a valid program. (secure.rs:1)
- 🔵 **Info** [AI] — The provided JSON file seems to be a template for a Solana program, but it is not a complete program and does not contain any executable code. (vulnerable.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 18:39 UTC
**Confidence Score:** 74/100 (↓ -19 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (50) [Margin: +1.4%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "process_instruction" modifies account data but lacks an is_signer verification check. (miso-cli/tests/fixtures/lib.rs:14)
- 🔴 **Critical** [STATIC] — Function "process_instruction" reads account data but does not explicitly check if the account owner matches the program ID. (miso-cli/tests/fixtures/lib.rs:14)
- 🟠 **High** [AI] — The contract lacks a signer check for the counter_account, which could lead to unauthorized modifications. (lib.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations (count += 1) without checked_add or checked_sub, which could lead to potential overflows. (lib.rs:24)
- 🔵 **Info** [AI] — The contract does not validate the owner of the counter_account, which could lead to unauthorized modifications. (lib.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 18:39 UTC
**Confidence Score:** 95/100 (↑ +21 from previous run)
**Score Breakdown:** 75% AI (95) + 25% Static (100) [Margin: -1.6%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs

### Findings
- 🔵 **Low** [AI] — The code uses unwrap on checked_add, which may panic if an overflow occurs. Consider using a more robust error handling mechanism. (miso-cli/tests/fixtures/lib.rs:1)

### Areas for Improvement
---

## Run — 2026-07-25 19:15 UTC
**Confidence Score:** 81/100 (↓ -14 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (50) [Margin: -0.7%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "process_instruction" modifies account data but lacks an is_signer verification check. (miso-cli/tests/fixtures/lib.rs:14)
- 🔴 **Critical** [STATIC] — Function "process_instruction" reads account data but does not explicitly check if the account owner matches the program ID. (miso-cli/tests/fixtures/lib.rs:14)
- 🟠 **High** [AI] — The contract has a missing signer check in the Withdraw instruction. (vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the process_instruction function. (lib.rs:1)
- 🔵 **Low** [AI] — The contract does not handle errors explicitly in the withdraw function. (onecon.rs:1)
- 🔵 **Info** [AI] — The contract uses Anchor's native close constraint, which is a good practice. (secure.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 19:16 UTC
**Confidence Score:** 95/100 (↑ +14 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: +0.7%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function. (miso-cli/tests/fixtures/onecon.rs:1)
- 🔵 **Low** [AI] — The contract does not explicitly check for unbounded account sizes. (miso-cli/tests/fixtures/onecon.rs:1)
- 🔵 **Info** [AI] — The contract uses a safe and constrained CPI, but it's recommended to use a more specific program ID instead of a wildcard. (miso-cli/tests/fixtures/secure.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 21:01 UTC
**Confidence Score:** 93/100 (↓ -2 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: -0.9%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses CPI to transfer tokens, but the CPI program target is not explicitly validated. This could lead to potential vulnerabilities if the target program is not trusted. (onecon.rs:1)
- 🔵 **Low** [AI] — The contract uses a fixed fee calculation, which may not be suitable for all use cases. Consider adding more flexible fee calculation options. (secure.rs:1)
- 🔵 **Info** [AI] — The provided vulnerable contract code is not part of the main contract code and is likely used for testing purposes only. However, it is still important to ensure that this code is not accidentally deployed to production. (vulnerable.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 21:02 UTC
**Confidence Score:** 89/100 (↓ -4 from previous run)
**Score Breakdown:** 75% AI (85) + 25% Static (100) [Margin: +0.6%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The withdraw function is missing a signer check, allowing anyone to impersonate the admin. (miso-cli/tests/fixtures/lib.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function. (miso-cli/tests/fixtures/onecon.rs:1)
- 🔵 **Low** [AI] — The Withdraw instruction is missing a proper constraint for the vault owner, potentially allowing unauthorized access. (miso-cli/tests/fixtures/vulnerable.rs:1)
- 🔵 **Info** [AI] — The secure_contract uses safe practices such as checked arithmetic and signer checks. (miso-cli/tests/fixtures/secure.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 21:03 UTC
**Confidence Score:** 94/100 (↑ +5 from previous run)
**Score Breakdown:** 75% AI (92) + 25% Static (100) [Margin: -0.3%]
**Rule Set Version:** v1.0
**Files Scanned:** miso-cli/tests/fixtures/lib.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses checked_sub, but the unwrap_or(0) could potentially lead to unexpected behavior if the subtraction result is negative. (miso-cli/tests/fixtures/onecon.rs:1)
- 🔵 **Low** [AI] — The contract uses checked_mul and checked_div, but the unwrap could potentially lead to a panic if the division result is zero. (miso-cli/tests/fixtures/secure.rs:20)
- 🔵 **Info** [AI] — The provided JSON file does not contain any executable code, but it appears to be a template for a Withdraw instruction. It is recommended to review the actual implementation for security vulnerabilities. (miso-cli/tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 21:38 UTC
**Confidence Score:** 54/100 (↓ -40 from previous run)
**Score Breakdown:** 75% AI (60) + 25% Static (44) [Margin: -1.8%]
**Rule Set Version:** v1.0
**Files Scanned:** mentu.rs

### Findings
- 🔴 **Critical** [STATIC] — Struct "WithdrawVault" contains mutable accounts but has no Signer field or signer attribute constraint. (mentu.rs:42)
- 🔴 **Critical** [STATIC] — Field "authority" in "WithdrawVault" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (mentu.rs:46)
- 🟠 **High** [AI] — The withdraw function is missing a signer check for the authority account, allowing unauthorized access to the vault. (mentu.rs:1)
- 🟡 **Medium** [STATIC] — Raw arithmetic operator "-" detected. Consider using checked arithmetic to prevent overflow/underflow. (mentu.rs:24)
- 🟡 **Medium** [AI] — The withdraw function uses raw arithmetic operations without checked_add or checked_sub, which can lead to integer overflows. (mentu.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: UNCHECKED_ARITHMETIC, AI_FINDING.
---

## Run — 2026-07-25 21:39 UTC
**Confidence Score:** 87/100 (↑ +33 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: +1.7%]
**Rule Set Version:** v1.0
**Files Scanned:** mentu.rs

### Findings
- 🟠 **High** [AI] — Function withdraw_funds modifies account data but lacks an is_signer verification check. (mentu.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function. (mentu.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 21:41 UTC
**Confidence Score:** 55/100 (↓ -32 from previous run)
**Score Breakdown:** 75% AI (60) + 25% Static (44) [Margin: -1.3%]
**Rule Set Version:** v1.0
**Files Scanned:** mentor_contract.rs, mentu.rs, miso-cli/tests/fixtures/lib.rs, miso-cli/tests/fixtures/onecon.rs, miso-cli/tests/fixtures/secure.rs, miso-cli/tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Struct "WithdrawVault" contains mutable accounts but has no Signer field or signer attribute constraint. (mentor_contract.rs:41)
- 🔴 **Critical** [STATIC] — Field "authority" in "WithdrawVault" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (mentor_contract.rs:45)
- 🟠 **High** [AI] — Missing Signer Check: The `withdraw` function does not verify if the `authority` account is a signer, allowing unauthorized access to the vault. (mentor_contract.rs:1)
- 🟡 **Medium** [STATIC] — Raw arithmetic operator "-" detected. Consider using checked arithmetic to prevent overflow/underflow. (mentor_contract.rs:23)
- 🟡 **Medium** [AI] — Unsafe Arithmetic: The `withdraw` function uses raw subtraction, which can cause underflow errors. Use `checked_sub` to prevent this. (mentor_contract.rs:1)
- 🔵 **Low** [AI] — Missing Ownership Check: The `withdraw` function does not verify if the `vault` account is owned by the correct program ID. (mentor_contract.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: UNCHECKED_ARITHMETIC, AI_FINDING.
---

## Run — 2026-07-25 21:44 UTC
**Confidence Score:** 54/100 (↓ -1 from previous run)
**Score Breakdown:** 75% AI (60) + 25% Static (44) [Margin: -2.2%]
**Rule Set Version:** v1.0
**Files Scanned:** first_contract.rs

### Findings
- 🔴 **Critical** [STATIC] — Struct "WithdrawVault" contains mutable accounts but has no Signer field or signer attribute constraint. (first_contract.rs:42)
- 🔴 **Critical** [STATIC] — Field "authority" in "WithdrawVault" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (first_contract.rs:46)
- 🟠 **High** [AI] — The WithdrawVault instruction handler lacks a signer check for the authority account, allowing unauthorized access to the vault. (first_contract.rs:1)
- 🟡 **Medium** [STATIC] — Raw arithmetic operator "-" detected. Consider using checked arithmetic to prevent overflow/underflow. (first_contract.rs:24)
- 🟡 **Medium** [AI] — The withdraw function performs raw arithmetic operations without checked_add or checked_sub, potentially leading to integer overflows. (first_contract.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: UNCHECKED_ARITHMETIC, AI_FINDING.
---

## Run — 2026-07-25 21:53 UTC
**Confidence Score:** 91/100 (↑ +37 from previous run)
**Score Breakdown:** 75% AI (90) + 25% Static (100) [Margin: -1.8%]
**Rule Set Version:** v1.0
**Files Scanned:** first_contract.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses checked_sub to prevent potential overflows, but it does not handle the case where the amount is greater than the vault balance. This could lead to an error being returned to the user. (first_contract.rs:1)
- 🔵 **Info** [AI] — The contract uses a Signer account type for the authority, which is a good practice. However, it does not explicitly check the owner of the vault account. This could potentially lead to issues if the vault account is not owned by the expected program. (first_contract.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 21:54 UTC
**Confidence Score:** 100/100 (↑ +9 from previous run)
**Score Breakdown:** 75% AI (100) + 25% Static (100) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** first_contract.rs

### Findings
- ✔ No issues detected.

### Areas for Improvement
- Maintain current patterns and code safety standards.
---

## Run — 2026-07-25 21:58 UTC
**Confidence Score:** 55/100 (↓ -45 from previous run)
**Score Breakdown:** 75% AI (60) + 25% Static (44) [Margin: -0.8%]
**Rule Set Version:** v1.0
**Files Scanned:** lib.rs

### Findings
- 🔴 **Critical** [STATIC] — Struct "WithdrawVault" contains mutable accounts but has no Signer field or signer attribute constraint. (lib.rs:42)
- 🔴 **Critical** [STATIC] — Field "authority" in "WithdrawVault" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (lib.rs:46)
- 🟠 **High** [AI] — The withdraw function is missing a signer check for the authority account. This allows any account to withdraw funds from the vault, bypassing the intended authority control. (lib.rs:23)
- 🟡 **Medium** [STATIC] — Raw arithmetic operator "-" detected. Consider using checked arithmetic to prevent overflow/underflow. (lib.rs:24)
- 🟡 **Medium** [AI] — The withdraw function uses raw arithmetic operations without checked_add or checked_sub. This can lead to integer overflows and potentially allow an attacker to drain the vault's balance. (lib.rs:26)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: UNCHECKED_ARITHMETIC, AI_FINDING.
---

## Run — 2026-07-25 21:59 UTC
**Confidence Score:** 95/100 (↑ +40 from previous run)
**Score Breakdown:** 75% AI (90) + 25% Static (100) [Margin: +2%]
**Rule Set Version:** v1.0
**Files Scanned:** lib.rs

### Findings
- 🔵 **Info** [AI] — The contract uses checked_sub to prevent potential overflows, which is a good practice. (lib.rs:1)

### Areas for Improvement
---

## Run — 2026-07-25 22:58 UTC
**Confidence Score:** 58/100 (↓ -37 from previous run)
**Score Breakdown:** 75% AI (60) + 25% Static (44) [Margin: +1.7%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🔴 **Critical** [STATIC] — Struct "WithdrawVault" contains mutable accounts but has no Signer field or signer attribute constraint. (test-con.rs:42)
- 🔴 **Critical** [STATIC] — Field "authority" in "WithdrawVault" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (test-con.rs:46)
- 🟠 **High** [AI] — The withdraw function is missing a signer check for the authority account. This allows any account to withdraw funds from the vault, potentially draining its balance. (test-con.rs:1)
- 🟡 **Medium** [STATIC] — Raw arithmetic operator "-" detected. Consider using checked arithmetic to prevent overflow/underflow. (test-con.rs:24)
- 🟡 **Medium** [AI] — The withdraw function uses raw arithmetic operations without checked_add or checked_sub. This can lead to integer overflows and potentially allow an attacker to manipulate the vault's balance. (test-con.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
- Address arithmetic or configuration recommendations: UNCHECKED_ARITHMETIC, AI_FINDING.
---

## Run — 2026-07-25 22:59 UTC
**Confidence Score:** 91/100 (↑ +33 from previous run)
**Score Breakdown:** 75% AI (90) + 25% Static (100) [Margin: -1.9%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🔵 **Info** [AI] — The contract uses checked_sub to prevent potential overflows, which is a good practice. (test-con.rs:1)

### Areas for Improvement
---

## Run — 2026-07-25 23:03 UTC
**Confidence Score:** 26/100 (↓ -65 from previous run)
**Score Breakdown:** 75% AI (20) + 25% Static (38) [Margin: +1.2%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "process_instruction" modifies account data but lacks an is_signer verification check. (test-con.rs:12)
- 🔴 **Critical** [STATIC] — Function "process_instruction" reads account data but does not explicitly check if the account owner matches the program ID. (test-con.rs:12)
- 🔴 **Critical** [AI] — The contract lacks a signer verification check, allowing anyone to invoke the instruction and drain the treasury account. (test-con.rs:23)
- 🔴 **Critical** [AI] — The contract lacks an ownership check, allowing the treasury account to be drained without verifying its owner. (test-con.rs:25)
- 🟠 **High** [STATIC] — Function "process_instruction" appears to close/drain lamports from an account without safely clearing its data or reassigning ownership. (test-con.rs:12)
- 🟠 **High** [AI] — The contract uses raw math operations without checked_add or checked_sub, which can lead to integer overflows. (test-con.rs:30)
- 🟡 **Medium** [AI] — The contract does not validate the recipient account, which can lead to unintended behavior. (test-con.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, UNSAFE_ACCOUNT_CLOSE, AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 23:03 UTC
**Confidence Score:** 95/100 (↑ +69 from previous run)
**Score Breakdown:** 75% AI (90) + 25% Static (100) [Margin: +2.3%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints, which could lead to potential overflows. (test-con.rs:1)
- 🔵 **Low** [AI] — The contract lacks explicit signer checks for the treasury account, which could potentially allow unauthorized access. (test-con.rs:1)
- 🔵 **Info** [AI] — The contract checks the owner of the treasury account, which is a good practice to prevent unauthorized access. (test-con.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 23:10 UTC
**Confidence Score:** 85/100 (↓ -10 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: -0.5%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw account data length check without verifying the account's data contents or structure. (test-con.rs:1)
- 🔵 **Low** [AI] — The contract does not explicitly check for the treasury account's signer status, which may not be a vulnerability in this specific context but is still worth reviewing. (test-con.rs:1)
- 🔵 **Info** [AI] — The contract clones the treasury account info, which may not be necessary and could potentially lead to unintended behavior. (test-con.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 23:10 UTC
**Confidence Score:** 86/100 (↑ +1 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: +1%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw data access without explicit owner checks for all accounts and lacks a typed account for treasury, which could lead to unchecked account data issues. (test-con.rs:1)
- 🟡 **Medium** [AI] — The contract lacks a checked_add or checked_sub operation for potential arithmetic overflows in the treasury data handling. (test-con.rs:1)
- 🔵 **Info** [AI] — The contract performs an owner check for the treasury account but does not verify the signer for the treasury account explicitly. (test-con.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 23:12 UTC
**Confidence Score:** 84/100 (↓ -2 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: -0.8%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw data access without explicit owner checks for all accounts, and lacks explicit signer checks for mutable accounts. (test-con.rs:1)
- 🔵 **Info** [AI] — The contract does not use Anchor safety constraints for arithmetic operations, which could lead to potential overflows. (test-con.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 23:13 UTC
**Confidence Score:** 92/100 (↑ +8 from previous run)
**Score Breakdown:** 75% AI (90) + 25% Static (100) [Margin: -0.1%]
**Rule Set Version:** v1.0
**Files Scanned:** test-con.rs

### Findings
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints, which could lead to potential overflows. (test-con.rs:1)
- 🔵 **Low** [AI] — The contract does not explicitly check for unbounded account size, which could lead to potential issues with account initialization. (test-con.rs:1)
- 🔵 **Info** [AI] — The contract uses assert statements for account validation, which could be improved by using more robust validation mechanisms. (test-con.rs:1)

### Areas for Improvement
- Address arithmetic or configuration recommendations: AI_FINDING.
---

