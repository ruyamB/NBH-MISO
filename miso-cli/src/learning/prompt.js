import readline from 'readline';
import { extractLearningFeatures } from './sanitizer.js';
import { saveKnowledgeRecords } from './knowledge.js';

function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

function normalizeInput(input) {
  const val = input ? input.trim().toLowerCase() : '';
  if (['y', 'yes'].includes(val)) return 'Y';
  if (['n', 'no'].includes(val)) return 'N';
  if (['k', 'know', 'more'].includes(val)) return 'K';
  return null;
}

export async function promptSelfLearningLoop(scanResult) {
  if (!scanResult?.findings?.length) return;
  if (process.env.MISO_TEST === 'true' || !process.stdin.isTTY) return;

  console.log('\n────────────────────────────────────');
  console.log('\x1b[36mHelp improve Miso?\x1b[0m\n');
  console.log('Your scan detected vulnerabilities.\n');
  console.log('Would you like to anonymously contribute this scan to improve future detections?\n');
  console.log('[Y] Yes\n[N] No\n[K] Know More\n');

  let choice = normalizeInput(await askQuestion('Choice: '));
  while (!choice) { console.log('\x1b[31mInvalid choice.\x1b[0m'); choice = normalizeInput(await askQuestion('Choice: ')); }
  if (choice === 'N') return;

  if (choice === 'K') {
    console.log('\n\x1b[36mMiso only learns with your permission.\x1b[0m\n');
    console.log('If you choose "Yes", Miso does NOT upload your smart contract source code.');
    console.log('It only uploads anonymized: vulnerability type, severity, AST patterns, AI reasoning, and suggested fixes.\n');
    console.log('[Y] Yes\n[N] No\n');
    choice = normalizeInput(await askQuestion('Choice: '));
    while (choice !== 'Y' && choice !== 'N') { choice = normalizeInput(await askQuestion('Choice: ')); }
    if (choice === 'N') return;
  }

  if (choice === 'Y') {
    console.log('\x1b[33mExtracting anonymized security features...\x1b[0m');
    const records = extractLearningFeatures(scanResult);
    await saveKnowledgeRecords(records);
    console.log('\x1b[32m✔ Anonymized vulnerability knowledge contributed to Miso Hub.\x1b[0m\n');
  }
}
