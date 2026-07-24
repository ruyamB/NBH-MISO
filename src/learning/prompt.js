import readline from 'readline';
import { extractLearningFeatures } from './sanitizer.js';
import { saveKnowledgeRecords } from './knowledge.js';

function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
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
  // Only prompt if vulnerabilities were detected
  if (!scanResult || !scanResult.findings || scanResult.findings.length === 0) {
    return;
  }

  // Non-interactive environment or automated test flag
  if (process.env.MISO_TEST === 'true' || !process.stdin.isTTY) {
    return;
  }

  console.log('\n────────────────────────────────────');
  console.log('\x1b[36mHelp improve Miso?\x1b[0m\n');
  console.log('Your scan detected vulnerabilities.\n');
  console.log('Would you like to anonymously contribute this scan to improve future detections?\n');
  console.log('[Y] Yes');
  console.log('[N] No');
  console.log('[K] Know More\n');

  let choiceInput = await askQuestion('Choice: ');
  let choice = normalizeInput(choiceInput);

  while (!choice) {
    console.log('\x1b[31mInvalid choice. Please select [Y], [N], or [K].\x1b[0m');
    choiceInput = await askQuestion('Choice: ');
    choice = normalizeInput(choiceInput);
  }

  if (choice === 'N') {
    // Delete temporary learning data and exit cleanly without uploading
    return;
  }

  if (choice === 'K') {
    console.log('\n\x1b[36mMiso only learns with your permission.\x1b[0m\n');
    console.log('If you choose "Yes", Miso DOES NOT upload your smart contract.\n');
    console.log('Instead, it uploads only anonymized security knowledge, such as:');
    console.log('• Vulnerability type');
    console.log('• Severity');
    console.log('• Abstract syntax (AST) patterns');
    console.log('• Bytecode features');
    console.log('• AI reasoning');
    console.log('• Suggested remediation');
    console.log('• Anonymous vector embeddings\n');
    console.log('Miso automatically removes:');
    console.log('• Source code');
    console.log('• API keys');
    console.log('• Wallet addresses');
    console.log('• Secrets');
    console.log('• Project names');
    console.log('• Developer information');
    console.log('• Proprietary business logic\n');
    console.log('Your contribution helps improve future vulnerability detection for the entire community while protecting your privacy.\n');
    console.log('Would you like to contribute?\n');
    console.log('[Y] Yes');
    console.log('[N] No\n');

    let followUpInput = await askQuestion('Choice: ');
    choice = normalizeInput(followUpInput);

    while (choice !== 'Y' && choice !== 'N') {
      console.log('\x1b[31mInvalid choice. Please select [Y] or [N].\x1b[0m');
      followUpInput = await askQuestion('Choice: ');
      choice = normalizeInput(followUpInput);
    }

    if (choice === 'N') {
      return;
    }
  }

  if (choice === 'Y') {
    console.log('\x1b[33mExtracting anonymized security features...\x1b[0m');
    const records = extractLearningFeatures(scanResult);
    await saveKnowledgeRecords(records);
    console.log('\x1b[32m✔ Thank you! Anonymized vulnerability knowledge contributed to Miso Hub.\x1b[0m\n');
  }
}
