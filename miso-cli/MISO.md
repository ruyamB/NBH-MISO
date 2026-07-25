## Run — 2026-07-25 10:38 UTC
**Confidence Score:** 25/100
**Score Breakdown:** 75% AI (25) + 25% Static (25) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [STATIC] — Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
---

## Run — 2026-07-25 10:43 UTC
**Confidence Score:** 75/100 (↑ +50 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 10:44 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 10:50 UTC
**Confidence Score:** 25/100 (↓ -50 from previous run)
**Score Breakdown:** 75% AI (25) + 25% Static (25) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [STATIC] — Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
---

## Run — 2026-07-25 10:51 UTC
**Confidence Score:** 75/100 (↑ +50 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 10:53 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 10:55 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 10:59 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:06 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:07 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:10 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:16 UTC
**Confidence Score:** 25/100 (↓ -50 from previous run)
**Score Breakdown:** 75% AI (25) + 25% Static (25) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [STATIC] — Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
---

## Run — 2026-07-25 11:17 UTC
**Confidence Score:** 75/100 (↑ +50 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:20 UTC
**Confidence Score:** 25/100 (↓ -50 from previous run)
**Score Breakdown:** 75% AI (25) + 25% Static (25) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [STATIC] — Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [STATIC] — Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:116)
- 🔴 **Critical** [AI] — [AI Verified] Field "target_program" in "CallAllowedProgram" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:406)
- 🔴 **Critical** [AI] — [AI Verified] Function "withdraw_funds" reads account data but does not explicitly check if the account owner matches the program ID. (tests/fixtures/vulnerable.rs:116)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_SIGNER_CHECK, MISSING_OWNERSHIP_CHECK, AI_FINDING.
---

## Run — 2026-07-25 11:20 UTC
**Confidence Score:** 75/100 (↑ +50 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:22 UTC
**Confidence Score:** 57/100 (↓ -18 from previous run)
**Score Breakdown:** 75% AI (40) + 25% Static (100) [Margin: +1.7%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The contract lacks an owner constraint check for the target_program field in CallAllowedProgram, allowing for potential unauthorized access. (tests/fixtures/vulnerable.rs:1)
- 🟠 **High** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints, which can lead to potential overflows. (tests/fixtures/vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract does not validate the account data, which can lead to potential security vulnerabilities. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 11:23 UTC
**Confidence Score:** 56/100 (↓ -1 from previous run)
**Score Breakdown:** 75% AI (40) + 25% Static (100) [Margin: +1.2%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The CallAllowedProgram instruction lacks an owner constraint check for the target_program field, allowing arbitrary program execution. (tests/fixtures/vulnerable.rs:1)
- 🟠 **High** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints, which can lead to integer overflows. (tests/fixtures/vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract lacks explicit signer checks for accounts, which can allow unauthorized modifications to account data. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 11:23 UTC
**Confidence Score:** 85/100 (↑ +29 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: -0.4%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function. (tests/fixtures/vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract lacks explicit signer checks for accounts that are being modified. (tests/fixtures/vulnerable.rs:1)
- 🔵 **Info** [AI] — The contract has proper account validation and constraint verification for the target program. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 11:27 UTC
**Confidence Score:** 46/100 (↓ -39 from previous run)
**Score Breakdown:** 75% AI (40) + 25% Static (63) [Margin: -0.1%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🔴 **Critical** [STATIC] — Field "vault" in "Withdraw" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/vulnerable.rs:65)
- 🔴 **Critical** [AI] — The withdraw function lacks a signer check for the user account, allowing an attacker to withdraw funds without authorization. (tests/fixtures/vulnerable.rs:24)
- 🟠 **High** [STATIC] — Function "withdraw" performs a Cross-Program Invocation (CPI) without validating the target program ID. (tests/fixtures/vulnerable.rs:18)
- 🟠 **High** [AI] — The withdraw function uses raw math operations without checked_add or checked_sub, which can lead to integer overflows. (tests/fixtures/vulnerable.rs:31)
- 🟡 **Medium** [AI] — The withdraw function updates the state too late, allowing an attacker to reenter the function and drain the vault. (tests/fixtures/vulnerable.rs:28)
- 🔵 **Low** [AI] — The deposit function lacks input validation, which can lead to unexpected behavior. (tests/fixtures/vulnerable.rs:20)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: MISSING_OWNERSHIP_CHECK, UNCONSTRAINED_CPI, AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

## Run — 2026-07-25 11:28 UTC
**Confidence Score:** 85/100 (↑ +39 from previous run)
**Score Breakdown:** 75% AI (80) + 25% Static (100) [Margin: +0.3%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [AI] — Function withdraw_funds modifies account data but lacks an is_signer verification check. (tests/fixtures/vulnerable.rs:1)
- 🟡 **Medium** [AI] — The contract uses raw math operations without checked_add/checked_sub or Anchor safety constraints in the withdraw function. (tests/fixtures/vulnerable.rs:1)
- 🔵 **Info** [AI] — The contract does not have explicit PDA bump seed validation. (tests/fixtures/vulnerable.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: AI_FINDING.
- Address arithmetic or configuration recommendations: AI_FINDING.
---

