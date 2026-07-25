import path from 'path';
process.env.MISO_TEST = 'true';
import { scanFiles } from '../src/engine.js';

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`\x1b[31m✕ Test Failed: ${message}\x1b[0m`);
    failed = true;
  } else {
    console.log(`\x1b[32m✔ Test Passed: ${message}\x1b[0m`);
  }
}

console.log('\nStarting MISO Automated Test Suite...\n');

// 1. Test Vulnerable Contract
console.log('--- Testing Vulnerable Contract Scan ---');
const vulnerablePath = path.join(process.cwd(), 'tests', 'fixtures', 'vulnerable.rs');
const vulnResult = await scanFiles([vulnerablePath]);

console.log(`Computed Confidence Score: ${vulnResult.score}/100 (AI: ${vulnResult.aiScore}, Static: ${vulnResult.staticScore})`);
console.log(`Total Findings: ${vulnResult.findings.length}`);
console.log('All Vulnerable Findings:', vulnResult.findings.map(f => ({ ruleId: f.ruleId, file: f.file, line: f.line, details: f.details })));

// We expect static rules to be triggered
const triggeredRules = new Set(vulnResult.findings.map(f => f.ruleId));
console.log('Triggered rules:', [...triggeredRules]);

assert(vulnResult.score < 50, `Vulnerable contract score (${vulnResult.score}) should be below 50`);
assert(triggeredRules.has('MISSING_SIGNER_CHECK'), 'Should trigger MISSING_SIGNER_CHECK');
assert(triggeredRules.has('MISSING_OWNERSHIP_CHECK'), 'Should trigger MISSING_OWNERSHIP_CHECK');
assert(vulnResult.aiScore !== undefined, 'Result should include aiScore');
assert(vulnResult.staticScore !== undefined, 'Result should include staticScore');

console.log('\n--- Testing Secure Contract Scan ---');
const securePath = path.join(process.cwd(), 'tests', 'fixtures', 'secure.rs');
const secureResult = await scanFiles([securePath]);

console.log(`Computed Score: ${secureResult.score}/100`);
console.log(`Total Findings: ${secureResult.findings.length}`);
console.log('All Secure Findings:', secureResult.findings.map(f => ({ ruleId: f.ruleId, file: f.file, line: f.line, details: f.details })));

assert(secureResult.score === 100, `Secure contract score should be 100, got: ${secureResult.score}`);
assert(secureResult.findings.length === 0, `Secure contract findings count should be 0, got: ${secureResult.findings.length}`);

// Test prompt loader module
import { loadPromptContext } from '../src/ai/prompts.js';
const prompts = loadPromptContext();
assert(typeof prompts.systemPrompt === 'string' && prompts.systemPrompt.length > 0, 'Prompt loader should load systemPrompt');
assert(typeof prompts.instructions === 'string' && prompts.instructions.length > 0, 'Prompt loader should load instructions');
assert(typeof prompts.rules === 'string' && prompts.rules.length > 0, 'Prompt loader should load rules');

// --- Testing Milestone 2 Gating & Config ---
console.log('\n--- Testing M2 Config & Deploy Commands ---');
import { execSync } from 'child_process';
import fs from 'fs';

// Helper to strip ANSI escape codes
function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

// Helper to run command and capture output (redirecting stderr to stdout)
function runCliCmd(cmd) {
  try {
    const output = execSync(cmd + ' 2>&1', { encoding: 'utf8', env: { ...process.env, MISO_TEST: 'true' } });
    return stripAnsi(output);
  } catch (err) {
    return stripAnsi((err.stdout || '') + (err.stderr || ''));
  }
}

// Ensure clean state config first
const configDir = path.join(process.cwd(), '.miso');
const configFilePath = path.join(configDir, 'config.json');
if (fs.existsSync(configFilePath)) {
  fs.unlinkSync(configFilePath);
}

// 1. Check default config display
let configOutput = runCliCmd('node bin/miso.js config');
assert(configOutput.includes('Gating Threshold: 90/100'), 'Default gating threshold should be 90');
assert(configOutput.includes('Active Rules:     default'), 'Default active rules should be default');

// 2. Set threshold
let setThresholdOutput = runCliCmd('node bin/miso.js config threshold 85');
assert(setThresholdOutput.includes('Threshold successfully updated to 85/100'), 'Should update threshold');

// 3. Set deployCommand
let setDeployOutput = runCliCmd('node bin/miso.js config deployCommand "echo MockDeploy"');
assert(setDeployOutput.includes('Deploy command successfully set to "echo MockDeploy"'), 'Should update deploy command');

// 4. Set activeRules
let setRulesOutput = runCliCmd('node bin/miso.js config activeRules default,owasp,extra');
assert(setRulesOutput.includes('Active rules successfully updated to "default, owasp, extra"'), 'Should update active rules');

// 5. Set geminiApiKey
let setApiKeyOutput = runCliCmd('node bin/miso.js config geminiApiKey test_gemini_key_1234');
assert(setApiKeyOutput.includes('User Gemini API Key successfully saved.'), 'Should update geminiApiKey');

// Verify configuration was updated
configOutput = runCliCmd('node bin/miso.js config');
assert(configOutput.includes('Gating Threshold: 85/100'), 'Threshold should be updated to 85');
assert(configOutput.includes('Deploy Command:   echo MockDeploy'), 'Deploy command should be echo MockDeploy');
assert(configOutput.includes('Active Rules:     default, owasp, extra'), 'Active rules should be updated');
assert(configOutput.includes('User Gemini API Key: ****1234'), 'Gemini API key mask should be displayed');

// Test usage command
let usageOutput = runCliCmd('node bin/miso.js usage');
assert(!isNaN(parseInt(usageOutput.trim())), 'Usage command should return a numeric token count');
console.log('✔ Test Passed: usage command returns token usage count');

// 5. Test deploy gating logic
// Let's create a temporary MISO.md with a score of 80/100
const misoMdPath = path.join(process.cwd(), 'MISO.md');
const originalMisoMd = fs.existsSync(misoMdPath) ? fs.readFileSync(misoMdPath, 'utf8') : null;

// Add mock auth to avoid prompting during deploy command
if (fs.existsSync(configFilePath)) {
  const currentConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
  currentConfig.auth = { username: 'testuser', token: 'testtoken' };
  fs.writeFileSync(configFilePath, JSON.stringify(currentConfig, null, 2), 'utf8');
}

fs.writeFileSync(misoMdPath, `## Run — 2026-07-15 14:32 UTC\n**Confidence Score:** 80/100\n**Rule Set Version:** v1.0\n**Files Scanned:** lib.rs\n`);

// Threshold is 85. Score is 80. Deployment should fail.
let deployOutput = runCliCmd('node bin/miso.js deploy');
assert(deployOutput.includes('Score 80/100 is below threshold 85 — cannot deploy. Use --force to override.'), 'Deploy should be gated if below threshold');

// Using --force flag should warn but bypass
let deployForceOutput = runCliCmd('node bin/miso.js deploy --force');
assert(deployForceOutput.includes('WARNING: Deploying below threshold. This contract may have unresolved findings.'), 'Deploy with --force should warn');
assert(deployForceOutput.includes('Connecting to Solana Devnet:'), 'Deploy should connect to Solana Devnet');
assert(deployForceOutput.includes('--- MISO Solana Deployment Funding ---'), 'Deploy should output funding request heading');
assert(deployForceOutput.includes('[Mock QR Code]'), 'Deploy should output Mock QR Code in test mode');
assert(deployForceOutput.includes('Solana Pay Link:'), 'Deploy should print Solana Pay Link');
assert(deployForceOutput.includes('Phantom Wallet Deep Link:'), 'Deploy should print Phantom Wallet Deep Link');
assert(deployForceOutput.includes('Backpack Wallet Deep Link:'), 'Deploy should print Backpack Wallet Deep Link');
assert(deployForceOutput.includes('Payment detected! Wallet balance is now 5 devnet SOL.'), 'Deploy should print payment confirmation');
assert(deployForceOutput.includes('Executing deploy tool: echo MockDeploy'), 'Deploy with --force should execute deploy command');
assert(deployForceOutput.includes('✔ Deployment Successful'), 'Deploy should print deployment successful heading');
assert(deployForceOutput.includes('https://solscan.io/account/'), 'Deploy should print Solscan account link');
assert(deployForceOutput.includes('https://solscan.io/tx/'), 'Deploy should print Solscan tx link');

// Setting threshold lower (e.g. 75) so 80 clears it
runCliCmd('node bin/miso.js config threshold 75');
let deployClearOutput = runCliCmd('node bin/miso.js deploy');
assert(deployClearOutput.includes('Score 80/100 clears threshold 75 — proceeding with deploy.'), 'Deploy should proceed if score clears threshold');
assert(deployClearOutput.includes('Executing deploy tool: echo MockDeploy'), 'Deploy should execute deploy command');

// --- Testing Milestone 3 MISO Direct DB Integration ---
console.log('\n--- Testing M3 Direct DB Integration ---');
import { pool, initDb } from '../src/db.js';

// Ensure tables exist
await initDb();

// Clear database entries for testuser
try {
  await pool.query("DELETE FROM snapshots WHERE username = 'testuser'");
  await pool.query("DELETE FROM users WHERE username = 'testuser'");
} catch (e) {
  // ignore
}

// 1. Direct DB Signup Verification
const testToken = 'testpassword'; // We use password as token (auth_key)
await pool.query(
  'INSERT INTO users (username, auth_key, sign_in_count) VALUES ($1, $2, 1)',
  ['testuser', testToken]
);
console.log('✔ Direct DB signup simulation succeeded');

// 2. Direct DB Signin / Counter Verification
const userResultBefore = await pool.query('SELECT sign_in_count FROM users WHERE username = $1', ['testuser']);
const beforeCount = userResultBefore.rows[0].sign_in_count;
assert(beforeCount === 1, 'Initial sign-in count should be 1');

// Simulate sign-in (counter increment)
const newCount = beforeCount + 1;
await pool.query('UPDATE users SET sign_in_count = $1 WHERE username = $2', [newCount, 'testuser']);
const userResultAfter = await pool.query('SELECT sign_in_count FROM users WHERE username = $1', ['testuser']);
assert(userResultAfter.rows[0].sign_in_count === 2, 'Sign-in count should be incremented to 2');

// 3. Test saving snapshot via CLI (writing directly to Neon DB)
// Setup config to be authenticated
const config = {
  threshold: 90,
  deployCommand: '',
  activeRules: ['default'],
  auth: {
    username: 'testuser',
    token: testToken
  }
};
fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');

const localSnapshotsDir = path.join(process.cwd(), '.miso', 'snapshots');
if (fs.existsSync(localSnapshotsDir)) {
  fs.rmSync(localSnapshotsDir, { recursive: true, force: true });
}

// Run save command
const saveOutput = runCliCmd('node bin/miso.js save');
assert(saveOutput.includes('Snapshot successfully saved locally to .miso/snapshots/'), 'Local snapshot save should succeed');
assert(saveOutput.includes('Snapshot successfully synchronized with MISO Hub dashboard!'), 'Snapshot sync should succeed');

// 4. Verify snapshot was written directly to Neon DB
const expectedVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const snapsResult = await pool.query('SELECT score, contract_version, files_scanned FROM snapshots WHERE username = $1', ['testuser']);
assert(snapsResult.rows.length === 1, 'Should have 1 synchronized snapshot in Neon DB');
assert(snapsResult.rows[0].score !== undefined, 'Snapshot should contain score');
assert(snapsResult.rows[0].contract_version === expectedVersion, 'Snapshot should contain correct contract version in DB');
const dbFiles = snapsResult.rows[0].files_scanned;
assert(Array.isArray(dbFiles) && dbFiles.length > 0, 'Database files_scanned should be an array');
assert(dbFiles[0].name !== undefined, 'Each file entry in DB files_scanned should have name');
assert(dbFiles[0].version === expectedVersion, 'Each file entry in DB files_scanned should contain current version');

// Verify local snapshot file
assert(fs.existsSync(localSnapshotsDir), 'Local snapshots folder should exist');
const localSnaps = fs.readdirSync(localSnapshotsDir);
assert(localSnaps.length === 1 && localSnaps[0].endsWith('.json'), 'Local snapshot JSON file should be created');
const savedData = JSON.parse(fs.readFileSync(path.join(localSnapshotsDir, localSnaps[0]), 'utf8'));
assert(savedData.contractFiles !== undefined, 'Local snapshot should save contract file contents');
assert(Array.isArray(savedData.contractFiles) && savedData.contractFiles.length > 0, 'Local snapshot should contain non-empty contract files array');
assert(savedData.contractFiles[0].name !== undefined, 'Each file entry in snapshot should have name');
assert(savedData.contractFiles[0].version === expectedVersion, 'Each file entry in snapshot should contain current version');
// Cleanup local snapshot folder
fs.rmSync(localSnapshotsDir, { recursive: true, force: true });

// 5. Verify snapshot save fails when user status is revoked
await pool.query("UPDATE users SET status = 'revoked' WHERE username = 'testuser'");
const saveRevokedOutput = runCliCmd('node bin/miso.js save');
assert(saveRevokedOutput.includes('Error: Unauthorized or revoked session.'), 'Save should fail when status is revoked');

// 6. Test dev command
const devOutput = runCliCmd('node bin/miso.js dev');
assert(devOutput.includes('Your issue has been sent to developer section, and it will be checked.'), 'Dev command output should succeed');

// Verify issue was inserted in database
const issuesResult = await pool.query("SELECT * FROM developer_issues WHERE username = 'testuser'");
assert(issuesResult.rows.length === 1, 'Should have 1 recorded issue in Neon DB');
assert(issuesResult.rows[0].issue === 'test issue', 'Issue text should match');

// Cleanup issues table
try {
  await pool.query("DELETE FROM developer_issues WHERE username = 'testuser'");
} catch (e) {
  // ignore
}

// Cleanup database and temporary files, restore original MISO.md
if (fs.existsSync(configFilePath)) {
  fs.unlinkSync(configFilePath);
}
try {
  await pool.query("DELETE FROM users WHERE username = 'testuser'");
} catch (e) {
  // ignore
}
await pool.end();

if (originalMisoMd) {
  fs.writeFileSync(misoMdPath, originalMisoMd);
} else if (fs.existsSync(misoMdPath)) {
  fs.unlinkSync(misoMdPath);
}

if (failed) {
  console.error('\n\x1b[31mSome tests failed. Check logs above.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[32mAll tests completed successfully!\x1b[0m\n');
  process.exit(0);
}
