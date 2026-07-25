import { sanitizeText, extractLearningFeatures } from '../src/learning/sanitizer.js';
import { saveKnowledgeRecords, getRelevantKnowledge, loadLocalKnowledge } from '../src/learning/knowledge.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`\x1b[31m✕ Test Failed: ${message}\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ Test Passed: ${message}\x1b[0m`);
  }
}

console.log('\n--- Testing Miso Self-Learning Loop Module ---\n');

// 1. Test Sanitization
const rawText = `Found issue in C:\\Users\\User\\project\\contract.rs: API key gsk_1234567890abcdef1234567890 and wallet 0x1234567890123456789012345678901234567890. // Secret comment`;
const sanitized = sanitizeText(rawText);

console.log('Sanitized text output:', sanitized);
assert(!sanitized.includes('gsk_1234567890abcdef1234567890'), 'API key should be sanitized');
assert(!sanitized.includes('0x1234567890123456789012345678901234567890'), 'Wallet address should be sanitized');
assert(!sanitized.includes('C:\\Users\\User\\project'), 'Absolute path should be sanitized');
assert(!sanitized.includes('// Secret comment'), 'Code comments should be sanitized');

// 2. Test Feature Extraction
const mockScanResult = {
  score: 85,
  confidenceScore: 85,
  findings: [
    {
      ruleId: 'MISSING_SIGNER_CHECK',
      severity: 'High',
      details: 'Account check missing signer constraint in c:\\secret\\path.rs with key gsk_abcdef1234567890abcdef',
      recommendation: 'Add #[account(signer)] constraint',
      file: 'contract.rs',
      line: 42
    }
  ]
};

const records = extractLearningFeatures(mockScanResult);
assert(records.length === 1, 'Should extract 1 knowledge record');
const rec = records[0];

assert(rec.vulnerabilityType === 'MISSING_SIGNER_CHECK', 'vulnerabilityType matches');
assert(rec.severity === 'High', 'severity matches');
assert(!rec.aiReasoning.includes('c:\\secret\\path.rs'), 'aiReasoning path scrubbed');
assert(!rec.aiReasoning.includes('gsk_abcdef1234567890abcdef'), 'aiReasoning API key scrubbed');
assert(typeof rec.embedding === 'string', 'embedding is generated string');

// 3. Test Knowledge Database Persistence & Retrieval
await saveKnowledgeRecords(records);
const localRecords = loadLocalKnowledge();
assert(localRecords.length > 0, 'Local knowledge database should contain records');

const topK = await getRelevantKnowledge(['MISSING_SIGNER_CHECK'], 3);
assert(topK.length > 0, 'Should retrieve top-K relevant knowledge patterns');

console.log('\n\x1b[32m✔ All Miso Self-Learning Loop tests passed successfully!\x1b[0m\n');
