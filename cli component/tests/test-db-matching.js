import path from 'path';
process.env.MISO_TEST = 'true';
import { scanFiles } from '../src/engine.js';
import { saveKnowledgeRecords } from '../src/learning/knowledge.js';
import { findMatchingVulnerabilityPatterns } from '../src/learning/retrieval.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`\x1b[31m✕ Test Failed: ${message}\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ Test Passed: ${message}\x1b[0m`);
  }
}

console.log('\n--- Testing Knowledge Database Pre-Scan Pattern Matching ---\n');

const securePath = path.join(process.cwd(), 'tests', 'fixtures', 'secure.rs');
const vulnerablePath = path.join(process.cwd(), 'tests', 'fixtures', 'vulnerable.rs');

// 1. Test scanning clean contract -> should not match vulnerability patterns
console.log('1. Testing Pre-Scan on Clean Contract...');
const cleanMatch = await findMatchingVulnerabilityPatterns([securePath]);
assert(!cleanMatch.found, 'Clean contract should not match vulnerability patterns in database');

// 2. Add known vulnerability pattern into Knowledge DB
console.log('2. Inserting Vulnerability Pattern into Knowledge Database...');
await saveKnowledgeRecords([
  {
    vulnerabilityId: 'VULN-MATCH-TEST',
    language: 'rust',
    compilerVersion: 'cargo-1.75.0',
    vulnerabilityType: 'UNCHECKED_ACCOUNT_DATA',
    severity: 'High',
    embedding: '[]',
    astPattern: 'AccountInfo UncheckedAccount target_program CallAllowedProgram',
    bytecodePattern: '0x1234',
    aiReasoning: 'Field target_program in CallAllowedProgram is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check.',
    suggestedFix: 'Add program owner check or typed Account.',
    confidence: 95,
    frequency: 1,
    timestamp: new Date().toISOString()
  }
]);

// 3. Test scanning contract matching the stored vulnerability pattern
console.log('3. Testing Pre-Scan Pattern Matching on Vulnerable Contract...');
const vulnMatch = await findMatchingVulnerabilityPatterns([vulnerablePath]);
assert(vulnMatch.found, 'Should find matching vulnerability pattern in database');
assert(vulnMatch.findings.length > 0, 'Should return matched findings from database');
const hasUncheckedRule = vulnMatch.findings.some(f => f.ruleId === 'UNCHECKED_ACCOUNT_DATA');
assert(hasUncheckedRule, 'Findings should include UNCHECKED_ACCOUNT_DATA pattern');

// 4. Test scanFiles workflow integration
console.log('4. Testing scanFiles Integration Flow...');
const scanResult = await scanFiles([vulnerablePath], { checkDbMatch: true });
assert(scanResult.found === true, 'scanFiles should return database pattern match');
assert(scanResult.aiSummary.includes('Matched'), 'Summary should indicate database pattern match');

console.log('\n\x1b[32m✔ Pre-Scan Database Pattern Matching tests completed successfully!\x1b[0m\n');
