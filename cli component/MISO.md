## Run — 2026-07-15 14:32 UTC
**Confidence Score:** 80/100
**Rule Set Version:** v1.0
**Files Scanned:** lib.rs
## Run — 2026-07-25 07:30 UTC
**Confidence Score:** 75/100 (↓ -5 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/onecon.rs, tests/fixtures/secure.rs, tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/onecon.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

## Run — 2026-07-25 11:07 UTC
**Confidence Score:** 75/100 (↑ +0 from previous run)
**Score Breakdown:** 75% AI (75) + 25% Static (75) [Margin: +0%]
**Rule Set Version:** v1.0
**Files Scanned:** tests/fixtures/onecon.rs, tests/fixtures/secure.rs, tests/fixtures/vulnerable.rs

### Findings
- 🟠 **High** [DATABASE_MATCH] — [Database Match] Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check. (tests/fixtures/onecon.rs:1)

### Areas for Improvement
- Resolve critical/high-severity issues immediately: UNCHECKED_ACCOUNT_DATA.
---

