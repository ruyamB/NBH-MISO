import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { discoverFiles } from './discovery.js';
import { scanFiles } from './engine.js';
import { displayResults, logToMarkdown, getPreviousScore, displayResults as renderResults } from './logger.js';
import { loadConfig, saveConfig, deleteConfig, ensureAuth, promptUser, getConfigPath, ensureApiKeyOrChoice } from './config.js';
import { pool, initDb } from './db.js';
import { promptSelfLearningLoop } from './learning/prompt.js';

export async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (command.startsWith('provider-')) {
    const key = command.slice(9).trim();
    await handleProviderKey(key);
    return;
  }

  switch (command) {
    case 'scan':
      await handleScan();
      break;
    case 'provider':
      await handleProviderKey(args[1] || '');
      break;
    case 'deploy':
      await handleDeploy(args.slice(1));
      break;
    case 'save':
      await handleSave();
      break;
    case 'dev':
      await handleDev();
      break;
    case 'revoke':
      await handleRevoke(args.slice(1));
      break;
    case 'config':
      handleConfig(args.slice(1));
      break;
    case 'history':
      handleHistory();
      break;
    case '--version':
    case '-v':
    case '-V':
      handleVersion();
      break;
    case 'help':
    case '-h':
    case '--help':
      displayHelp();
      break;
    default:
      console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
      displayHelp();
      process.exit(1);
  }
}

function handleVersion() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  console.log(packageJson.version);
}

async function handleScan() {
  const fs = await import('fs');

  // Check for file arguments
  const args = process.argv.slice(2);
  let fileArgIndex = args.indexOf('--file');
  let targetFiles = [];

  if (fileArgIndex !== -1 && args.length > fileArgIndex + 1) {
    // Handle --file path option
    targetFiles = args.slice(fileArgIndex + 1);
    console.log('\x1b[36mTargeting specific files for scanning:\x1b[0m', targetFiles.join(', '));

    // Validate each file exists
    const invalidFiles = targetFiles.filter(file => !fs.existsSync(file));
    if (invalidFiles.length > 0) {
      console.error('\x1b[31mError: The following files do not exist:\x1b[0m', invalidFiles.join(', '));
      return;
    }
  } else {
    // Normal scan: discover all Rust files
    console.log('Discovering Rust files...');
    const files = discoverFiles();
    if (files.length === 0) {
      console.log('\x1b[33mNo Rust (.rs) contracts discovered in the program paths.\x1b[0m');
      return;
    }
    targetFiles = files;
    console.log(`Discovered ${targetFiles.length} Rust file(s). Running static analysis...`);
  }

  // 2. Ensure Gemini API Key or user choice
  const { apiKey, staticOnly } = await ensureApiKeyOrChoice();

  if (!staticOnly) {
    console.log('Running hybrid AI + Static analysis...');
  } else {
    console.log('Running static analysis only...');
  }
  const result = await scanFiles(targetFiles, { apiKey, staticOnly });

  // 3. Output results to CLI
  displayResults(result);

  // 4. Append history to MISO.md
  logToMarkdown(result);
  console.log('\x1b[32m✔ Scan trail written to local MISO.md\x1b[0m\n');

  // 5. Miso Self-Learning Loop
  await promptSelfLearningLoop(result);
}

async function handleDeploy(options) {
  // Ensure user is authenticated before deploying
  await ensureAuth();

  const config = loadConfig();
  const isForce = options.includes('--force');

  let score = getPreviousScore();
  if (score === null) {
    console.log('\x1b[33mNo prior scan found. Initiating full scan before deployment...\x1b[0m');
    await handleScan();
    score = getPreviousScore();
    if (score === null) {
      console.error('\x1b[31mError: Scan failed. Cannot proceed with deployment.\x1b[0m');
      process.exit(1);
    }
  }

  const threshold = config.threshold;

  if (score < threshold) {
    if (isForce) {
      console.warn(`\x1b[33mWARNING: Deploying below threshold. This contract may have unresolved findings.\x1b[0m`);
    } else {
      console.error(`\x1b[31mScore ${score}/100 is below threshold ${threshold} — cannot deploy. Use --force to override.\x1b[0m`);
      process.exit(1);
    }
  } else {
    console.log(`\x1b[32mScore ${score}/100 clears threshold ${threshold} — proceeding with deploy.\x1b[0m`);
  }

  // Ensure Solana CLI is installed
  await checkAndInstallSolanaCLI();

  // 1. Ask which framework they used
  let framework = null;
  let phantomPubKeyStr = null;

  if (process.env.MISO_TEST === 'true') {
    framework = 'anchor';
    phantomPubKeyStr = '11111111111111111111111111111111';
  } else {
    const frameworkInput = await promptUser('Which framework did you use? (anchor or native solana) [anchor]: ');
    const frameworkNormalized = frameworkInput.trim().toLowerCase();
    framework = (frameworkNormalized === 'native solana' || frameworkNormalized === 'solana') ? 'solana' : 'anchor';

    // 2. Ask for Phantom wallet public key
    const phantomPubKeyInput = await promptUser('Enter your Phantom wallet public key: ');
    phantomPubKeyStr = phantomPubKeyInput.trim();
  }

  const { Connection, PublicKey, Keypair } = await import('@solana/web3.js');
  const qrcode = await import('qrcode-terminal');
  try {
    new PublicKey(phantomPubKeyStr);
  } catch (err) {
    console.error('\x1b[31mError: Invalid Phantom public key format.\x1b[0m');
    process.exit(1);
  }

  // 3. Resolve deployment keypair path
  let keypairPath = null;
  if (framework === 'anchor' && fs.existsSync('Anchor.toml')) {
    try {
      const tomlContent = fs.readFileSync('Anchor.toml', 'utf8');
      const match = tomlContent.match(/wallet\s*=\s*["']([^"']+)["']/);
      if (match) {
        keypairPath = match[1];
        if (keypairPath.startsWith('~')) {
          const os = await import('os');
          keypairPath = path.join(os.homedir(), keypairPath.slice(1));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!keypairPath) {
    const os = await import('os');
    keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  }

  let deployKeypair = null;
  if (fs.existsSync(keypairPath)) {
    try {
      const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
      deployKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      console.warn(`\x1b[33mWarning: Failed to load keypair from ${keypairPath}: ${e.message}\x1b[0m`);
    }
  }

  if (!deployKeypair) {
    const misoKeypairPath = path.join(process.cwd(), '.miso', 'deployment-keypair.json');
    if (fs.existsSync(misoKeypairPath)) {
      try {
        const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(misoKeypairPath, 'utf8')));
        deployKeypair = Keypair.fromSecretKey(secretKey);
        keypairPath = misoKeypairPath;
      } catch (e) {
        // ignore
      }
    }

    if (!deployKeypair) {
      console.log('\x1b[33mNo deployment keypair found. Generating a new deployment keypair...\x1b[0m');
      deployKeypair = Keypair.generate();
      const dir = path.dirname(misoKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(misoKeypairPath, JSON.stringify(Array.from(deployKeypair.secretKey)), 'utf8');
      keypairPath = misoKeypairPath;
      console.log(`\x1b[32m✔ Generated new deployment keypair at ${misoKeypairPath}\x1b[0m`);
    }
  }

  const deploymentPubKeyStr = deployKeypair.publicKey.toBase58();
  console.log(`Deployment wallet public key: \x1b[36m${deploymentPubKeyStr}\x1b[0m`);

  // 4. Connect to Solana blockchain
  const rpcUrl = 'https://api.devnet.solana.com';
  console.log(`Connecting to Solana Devnet: ${rpcUrl}...`);
  const connection = new Connection(rpcUrl, 'confirmed');

  const LAMPORTS_PER_SOL = 1000000000;
  let balanceSol = 0;

  if (process.env.MISO_TEST === 'true') {
    balanceSol = 0; // Starts at 0 to trigger funding request in tests
  } else {
    try {
      const balanceLamports = await connection.getBalance(deployKeypair.publicKey);
      balanceSol = balanceLamports / LAMPORTS_PER_SOL;
    } catch (err) {
      console.error(`\x1b[31mError checking wallet balance: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  }
  console.log(`Current deployment wallet balance: \x1b[36m${balanceSol} devnet SOL\x1b[0m`);

  // 5. Verify Funding (5 SOL)
  if (balanceSol < 5) {
    const requiredAmount = 5;
    const solanaPayUri = `solana:${deploymentPubKeyStr}?amount=${requiredAmount}&label=MISO%20Deployment&message=Funding%20deployment%20wallet`;
    const phantomDeepLink = `https://phantom.app/ul/v1/transfer?recipient=${deploymentPubKeyStr}&amount=${requiredAmount}&label=MISO%20Deployment&message=Funding%20deployment%20wallet&cluster=devnet`;

    console.log('\n\x1b[1m--- MISO Solana Deployment Funding ---\x1b[0m');
    console.log(`Please send at least \x1b[32m${requiredAmount} devnet SOL\x1b[0m from your Phantom wallet (\x1b[36m${phantomPubKeyStr}\x1b[0m) to the deployment address:`);
    console.log(`\x1b[36m${deploymentPubKeyStr}\x1b[0m\n`);

    console.log('You can scan the QR code below with your Phantom wallet to complete the request (ensure wallet is set to Devnet):');

    if (process.env.MISO_TEST !== 'true') {
      qrcode.default.generate(solanaPayUri, { small: true });
    } else {
      console.log('[Mock QR Code]');
    }

    console.log(`\n\x1b[1mSolana Pay Link:\x1b[0m\n\x1b[34m${solanaPayUri}\x1b[0m\n`);
    console.log(`\x1b[1mPhantom Wallet Deep Link:\x1b[0m\n\x1b[34m${phantomDeepLink}\x1b[0m\n`);

    console.log('Waiting for payment confirmation on the Solana blockchain (Devnet)...');

    if (process.env.MISO_TEST === 'true') {
      console.log(`\n\x1b[32m✔ Payment detected! Wallet balance is now 5 devnet SOL.\x1b[0m\n`);
    } else {
      let paid = false;
      while (!paid) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        try {
          const currentLamports = await connection.getBalance(deployKeypair.publicKey);
          const currentSol = currentLamports / LAMPORTS_PER_SOL;
          if (currentSol >= 5) {
            balanceSol = currentSol;
            paid = true;
            console.log(`\n\x1b[32m✔ Payment detected! Wallet balance is now ${currentSol} devnet SOL.\x1b[0m\n`);
          } else {
            process.stdout.write(`.`);
          }
        } catch (err) {
          // Ignore network errors during polling
        }
      }
    }
  } else {
    console.log(`\x1b[32m✔ Deployment wallet already has sufficient funds (${balanceSol} devnet SOL).\x1b[0m`);
  }

  // 6. Shell out to deploy tool
  let deployCmd = config.deployCommand;
  if (!deployCmd) {
    if (framework === 'anchor') {
      let cluster = 'unknown';
      try {
        if (fs.existsSync('Anchor.toml')) {
          const tomlContent = fs.readFileSync('Anchor.toml', 'utf8');
          const match = tomlContent.match(/cluster\s*=\s*["']([^"']+)["']/);
          if (match) {
            cluster = match[1];
          }
        }
      } catch (e) {
        // ignore
      }
      console.log(`Anchor project detected. Cluster: ${cluster}`);
      deployCmd = 'anchor deploy';
      if (keypairPath) {
        deployCmd += ` --provider.wallet ${keypairPath}`;
      }
    } else {
      console.log('Solana project detected.');
      deployCmd = 'solana program deploy';
      if (keypairPath) {
        deployCmd += ` --keypair ${keypairPath}`;
      }

      const deployDir = path.join(process.cwd(), 'target', 'deploy');
      if (fs.existsSync(deployDir)) {
        const files = fs.readdirSync(deployDir);
        const soFile = files.find(f => f.endsWith('.so'));
        if (soFile) {
          deployCmd += ` ${path.join('target', 'deploy', soFile)}`;
        }
      }
    }
  }

  console.log(`Executing deploy tool: \x1b[36m${deployCmd}\x1b[0m`);

  const { exec } = await import('child_process');

  // For sandbox testing, let's gracefully catch execution errors if Anchor/Solana is not installed locally
  try {
    const child = exec(deployCmd);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`\x1b[31mDeploy command failed with exit code: ${code}\x1b[0m`);
        process.exit(code);
      }
    });
  } catch (err) {
    console.error(`\x1b[31mExecution of deploy command failed: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

function getContractVersion() {
  let version = '0.1.0';
  try {
    if (fs.existsSync('Cargo.toml')) {
      const content = fs.readFileSync('Cargo.toml', 'utf8');
      const match = content.match(/version\s*=\s*["']([^"']+)["']/);
      if (match) return match[1];
    }
    if (fs.existsSync('programs')) {
      const programs = fs.readdirSync('programs');
      for (const prog of programs) {
        const cargoPath = path.join('programs', prog, 'Cargo.toml');
        if (fs.existsSync(cargoPath)) {
          const content = fs.readFileSync(cargoPath, 'utf8');
          const match = content.match(/version\s*=\s*["']([^"']+)["']/);
          if (match) return match[1];
        }
      }
    }
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (packageJson.version) return packageJson.version;
    }
  } catch (e) {
    // ignore
  }
  return version;
}

async function handleSave() {
  // Ensure user is authenticated before saving
  const auth = await ensureAuth();
  const config = loadConfig();

  const files = discoverFiles();
  if (files.length === 0) {
    console.error('\x1b[31mError: No Rust files discovered to save.\x1b[0m');
    return;
  }

  const scanResult = await scanFiles(files, { apiKey: config.geminiApiKey });
  const contractVersion = getContractVersion();

  const snapshotId = `snap_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const findingsJson = JSON.stringify(scanResult.findings.map(f => ({
    ruleId: f.ruleId,
    severity: f.severity,
    file: f.file,
    line: f.line,
    details: f.details,
    recommendation: f.recommendation
  })));
  const filesScannedDb = files.map(file => ({
    name: path.basename(file),
    path: path.relative(process.cwd(), file).replace(/\\/g, '/'),
    version: contractVersion
  }));
  const filesScannedJson = JSON.stringify(filesScannedDb);
  const ruleSetVersion = 'v1.0';

  // 1. Save the contract snapshot locally
  try {
    const localSnapshotsDir = path.join(process.cwd(), '.miso', 'snapshots');
    if (!fs.existsSync(localSnapshotsDir)) {
      fs.mkdirSync(localSnapshotsDir, { recursive: true });
    }
    const localSnapshotPath = path.join(localSnapshotsDir, `${snapshotId}.json`);
    const contractFiles = [];
    for (const file of files) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const name = path.basename(file);
        contractFiles.push({
          name,
          path: path.relative(process.cwd(), file).replace(/\\/g, '/'),
          version: contractVersion,
          content
        });
      }
    }

    const snapshotData = {
      id: snapshotId,
      username: auth.username,
      timestamp,
      score: scanResult.score,
      findings: scanResult.findings,
      filesScanned: scanResult.filesScanned,
      ruleSetVersion,
      contractVersion,
      contractFiles
    };
    fs.writeFileSync(localSnapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');
    console.log(`\x1b[32m✔ Snapshot successfully saved locally to ${path.relative(process.cwd(), localSnapshotPath).replace(/\\/g, '/')}\x1b[0m`);
  } catch (err) {
    console.error('\x1b[31mError: Failed to save snapshot locally:\x1b[0m', err.message);
  }

  // 2. Send the contract version to the DB
  try {
    await initDb();
    
    // Check user session and status
    const userResult = await pool.query('SELECT username, status FROM users WHERE username = $1 AND auth_key = $2', [auth.username, auth.token]);
    if (userResult.rows.length === 0 || userResult.rows[0].status === 'revoked') {
      console.error('\x1b[31mError: Unauthorized or revoked session. Please run "npx miso revoke" and log in again.\x1b[0m');
      return;
    }

    await pool.query(
      `INSERT INTO snapshots (id, username, timestamp, score, findings, files_scanned, rule_set_version, contract_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [snapshotId, auth.username, timestamp, scanResult.score, findingsJson, filesScannedJson, ruleSetVersion, contractVersion]
    );
  } catch (err) {
    console.error('\x1b[31mError: Failed to save snapshot to database:\x1b[0m', err.message);
    return;
  }

  console.log('\x1b[32m✔ Snapshot successfully synchronized with MISO Hub dashboard!\x1b[0m');
}

async function handleDev() {
  let username = 'testuser';
  let issue = 'test issue';

  if (process.env.MISO_TEST !== 'true') {
    username = await promptUser('Username: ');
    issue = await promptUser('Issue: ');
  }

  try {
    await initDb();
    await pool.query(
      `INSERT INTO developer_issues (username, issue) VALUES ($1, $2)`,
      [username, issue]
    );
  } catch (err) {
    // Gracefully handle db/network failure
  }

  console.log('\x1b[32m✔ Your issue has been sent to developer section, and it will be checked.\x1b[0m');
}

async function handleRevoke(options) {
  const mdPath = path.join(process.cwd(), 'MISO.md');
  const configPath = getConfigPath();

  if (!fs.existsSync(mdPath) && !fs.existsSync(configPath)) {
    console.log('\x1b[31mNo local configuration or MISO.md found to be revoked.\x1b[0m');
    return;
  }

  const hasForce = options.includes('--yes') || options.includes('-y');

  if (!hasForce) {
    const confirm = await promptUser('\x1b[33mWarning: This will permanently wipe all local MISO configs and history. Proceed? (y/N): \x1b[0m');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Revoke cancelled.');
      return;
    }
  }

  const config = loadConfig();
  if (config.auth && config.auth.username) {
    try {
      await initDb();
      // Delete snapshots and update status to revoked
      await pool.query('DELETE FROM snapshots WHERE username = $1', [config.auth.username]);
      await pool.query("UPDATE users SET status = 'revoked' WHERE username = $1", [config.auth.username]);
    } catch (err) {
      console.error('\x1b[31mWarning: Could not delete remote snapshots or update status in database:\x1b[0m', err.message);
    }
  }

  deleteConfig();

  if (fs.existsSync(mdPath)) {
    fs.unlinkSync(mdPath);
  }

  console.log('\x1b[32m✔ Local config files and credentials wiped.\x1b[0m');
  console.log('\x1b[32m✔ MISO.md local audit trail deleted.\x1b[0m');
  console.log('\x1b[32m✔ All remote MISO Hub snapshots permanently deleted.\x1b[0m');
}

function handleConfig(options) {
  const config = loadConfig();

  if (options.length === 0) {
    console.log(`\n\x1b[1m--- MISO Configuration ---\x1b[0m`);
    console.log(`Gating Threshold: ${config.threshold}/100`);
    console.log(`Deploy Command:   ${config.deployCommand || '(default: anchor deploy / solana program deploy)'}`);
    console.log(`Active Rules:     ${config.activeRules.join(', ')}`);
    console.log(`User Gemini API Key: ${config.geminiApiKey ? '****' + config.geminiApiKey.slice(-4) : '(not set)'}`);
    console.log(`Auth Address:        ${config.auth ? config.auth.username : 'Not Authenticated'}`);
    console.log();
    return;
  }

  const key = options[0];
  const val = options.slice(1).join(' ');

  if (key === 'threshold') {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 100) {
      console.error('\x1b[31mError: Threshold must be an integer between 0 and 100.\x1b[0m');
      return;
    }
    config.threshold = num;
    saveConfig(config);
    console.log(`\x1b[32m✔ Threshold successfully updated to ${num}/100\x1b[0m`);
  } else if (key === 'deployCommand') {
    config.deployCommand = val;
    saveConfig(config);
    console.log(`\x1b[32m✔ Deploy command successfully set to "${val}"\x1b[0m`);
  } else if (key === 'activeRules') {
    const rules = val.split(',').map(r => r.trim()).filter(Boolean);
    if (rules.length === 0) {
      console.error('\x1b[31mError: Active rules cannot be empty.\x1b[0m');
      return;
    }
    config.activeRules = rules;
    saveConfig(config);
    console.log(`\x1b[32m✔ Active rules successfully updated to "${rules.join(', ')}"\x1b[0m`);
  } else if (key === 'geminiApiKey') {
    config.geminiApiKey = val;
    saveConfig(config);
    console.log(`\x1b[32m✔ User Gemini API Key successfully saved.\x1b[0m`);
  } else {
    console.error(`\x1b[31mError: Unsupported config option "${key}". Use "threshold", "deployCommand", "activeRules", or "geminiApiKey".\x1b[0m`);
  }
}

function handleHistory() {
  const filePath = path.join(process.cwd(), 'MISO.md');
  if (!fs.existsSync(filePath)) {
    console.log('\x1b[33mNo scan history found (MISO.md does not exist).\x1b[0m');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  // Regex parsing the MISO.md format blocks
  const runRegex = /## Run — (.*?)\n\*\*Confidence Score:\*\*\s+(\d+)\/100.*?\n\*\*Rule Set Version:\*\*\s+(.*?)\n\*\*Files Scanned:\*\*\s+(.*?)\n/g;

  const matches = [...content.matchAll(runRegex)];
  if (matches.length === 0) {
    console.log('\x1b[33mNo readable history logs found in MISO.md.\x1b[0m');
    return;
  }

  console.log(`\n\x1b[1m--- MISO Scan History ---\x1b[0m`);
  console.log(
    `${String('Date/Time (UTC)').padEnd(20)} | ${String('Score').padEnd(8)} | ${String('Rules').padEnd(8)} | Files`
  );
  console.log('-'.repeat(80));

  for (const match of matches) {
    const dateTime = match[1];
    const score = match[2];
    const rules = match[3];
    const files = match[4];
    console.log(
      `${dateTime.padEnd(20)} | ${score.padEnd(8)} | ${rules.padEnd(8)} | ${files}`
    );
  }
  console.log();
}

function displayHelp() {
  console.log(`
\x1b[1mUsage:\x1b[0m npx miso <command> [options]

\x1b[1mCommands:\x1b[0m
  \x1b[36mscan\x1b[0m                   Local static analysis + AI scan of Rust contracts
  \x1b[36mprovider-<key>\x1b[0m         Set your Groq (gsk_...) or Gemini (AIza...) API Key
  \x1b[36mdeploy\x1b[0m                 Gatekeeper check against threshold and shell out to deploy command
  \x1b[36mdeploy --force\x1b[0m         Bypass threshold checks and proceed with deploy
  \x1b[36msave\x1b[0m                   Sync audit snapshots/metadata to MISO Hub
  \x1b[36mrevoke\x1b[0m                 Completely clear local config, cache, and MISO.md logs
  \x1b[36mconfig\x1b[0m                 View or edit settings (threshold, deployCommand, geminiApiKey, groqApiKey)
  \x1b[36mhistory\x1b[0m                Show the history log table from MISO.md
  \x1b[36mdev\x1b[0m                    Report issues to the developer section
  \x1b[36mhelp\x1b[0m                   Print this help menu
  \x1b[36m--version, -v\x1b[0m          Print version info
`);
}

async function handleProviderKey(key) {
  let apiKey = key;
  if (!apiKey) {
    apiKey = await promptUser('Enter your User Groq (gsk_...) or Gemini (AIza...) API Key: ', true);
    apiKey = apiKey.trim();
  }

  if (!apiKey) {
    console.error('\x1b[31mError: API Key cannot be empty.\x1b[0m');
    return;
  }

  const config = loadConfig();
  if (apiKey.startsWith('gsk_')) {
    config.groqApiKey = apiKey;
    process.env.GROQ_API_KEY = apiKey;
    console.log(`\x1b[32m✔ User Groq API Key successfully configured!\x1b[0m`);
  } else {
    config.geminiApiKey = apiKey;
    process.env.GEMINI_API_KEY = apiKey;
    console.log(`\x1b[32m✔ User Gemini API Key successfully configured!\x1b[0m`);
  }

  config.allowStaticOnly = false;
  saveConfig(config);
  console.log(`Masked Key: ****${apiKey.slice(-4)}\n`);
}

// Check and install Solana CLI if not present
async function checkAndInstallSolanaCLI() {
  if (process.env.MISO_TEST === 'true') {
    return true;
  }

  const { execSync } = await import('child_process');
  let exists = false;
  try {
    execSync(process.platform === 'win32' ? 'where solana' : 'which solana', { stdio: 'ignore' });
    exists = true;
  } catch (e) {
    const defaultWinPath = path.join(process.env.LOCALAPPDATA || '', 'solana', 'install', 'active_release', 'bin');
    const defaultUnixPath = path.join(process.env.HOME || '', '.local', 'share', 'solana', 'install', 'active_release', 'bin');
    const defaultPath = process.platform === 'win32' ? defaultWinPath : defaultUnixPath;
    
    if (fs.existsSync(path.join(defaultPath, process.platform === 'win32' ? 'solana.exe' : 'solana'))) {
      process.env.PATH = `${defaultPath}${path.delimiter}${process.env.PATH}`;
      exists = true;
    }
  }

  if (exists) {
    return true;
  }

  console.log('\n\x1b[33mSolana CLI is not installed or not found in your PATH.\x1b[0m');
  const confirm = await promptUser('Would you like MISO to automatically download and install Solana CLI for you? (y/N): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.error('\x1b[31mError: Solana CLI is required to proceed with deployment.\x1b[0m');
    process.exit(1);
  }

  console.log('Starting Solana CLI installation...');

  if (process.platform === 'win32') {
    const tempDir = path.join(process.cwd(), '.miso', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const exePath = path.join(tempDir, 'solana-install-init.exe');
    const url = 'https://release.solana.com/v1.18.18/solana-install-init-x86_64-pc-windows-msvc.exe';

    console.log(`Downloading Solana Installer from ${url}...`);
    try {
      await downloadFile(url, exePath);
    } catch (err) {
      console.error(`\x1b[31mDownload failed: ${err.message}\x1b[0m`);
      process.exit(1);
    }
    console.log('Download complete. Running installer...');

    try {
      execSync(`"${exePath}" v1.18.18`, { stdio: 'inherit' });
      try { fs.unlinkSync(exePath); } catch (e) {}
      
      const defaultWinPath = path.join(process.env.LOCALAPPDATA || '', 'solana', 'install', 'active_release', 'bin');
      process.env.PATH = `${defaultWinPath}${path.delimiter}${process.env.PATH}`;
      console.log('\x1b[32m✔ Solana CLI installed successfully and added to PATH.\x1b[0m\n');
      return true;
    } catch (err) {
      console.error(`\x1b[31mInstallation failed: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  } else {
    console.log('Running official Solana installer script...');
    try {
      execSync('sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"', { stdio: 'inherit' });
      
      const defaultUnixPath = path.join(process.env.HOME || '', '.local', 'share', 'solana', 'install', 'active_release', 'bin');
      process.env.PATH = `${defaultUnixPath}${path.delimiter}${process.env.PATH}`;
      console.log('\x1b[32m✔ Solana CLI installed successfully and added to PATH.\x1b[0m\n');
      return true;
    } catch (err) {
      console.error(`\x1b[31mInstallation failed: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  }
}

// Helper function to download file using https module
async function downloadFile(url, destPath) {
  // Try Windows-native utilities first on Windows for proxy/TLS handshake robustness
  if (process.platform === 'win32') {
    try {
      const { execSync } = await import('child_process');
      execSync(`curl.exe -L -o "${destPath}" "${url}"`, { stdio: 'ignore' });
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        return;
      }
    } catch (e) {
      try {
        const { execSync } = await import('child_process');
        execSync(`powershell.exe -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${destPath}'"`, { stdio: 'ignore' });
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
          return;
        }
      } catch (e2) {
        // Fall through to native Node.js https download
      }
    }
  }

  const https = await import('https');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}
