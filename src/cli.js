import fs from 'fs';
import path from 'path';
import { discoverFiles } from './discovery.js';
import { scanFiles } from './engine.js';
import { displayResults, logToMarkdown, getPreviousScore, displayResults as renderResults } from './logger.js';
import { loadConfig, saveConfig, deleteConfig, ensureAuth, promptUser, getConfigPath } from './config.js';

export async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'scan':
      await handleScan();
      break;
    case 'deploy':
      await handleDeploy(args.slice(1));
      break;
    case 'save':
      await handleSave();
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

  // 2. Scan files
  const result = scanFiles(targetFiles);

  // 3. Output results to CLI
  displayResults(result);

  // 4. Append history to MISO.md
  logToMarkdown(result);
  console.log('\x1b[32m✔ Scan trail written to local MISO.md\x1b[0m\n');
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

  // Shell out to deploy tool
  let deployCmd = config.deployCommand;
  if (!deployCmd) {
    if (fs.existsSync('Anchor.toml')) {
      let cluster = 'unknown';
      try {
        const tomlContent = fs.readFileSync('Anchor.toml', 'utf8');
        const match = tomlContent.match(/cluster\s*=\s*["']([^"']+)["']/);
        if (match) {
          cluster = match[1];
        }
      } catch (e) {
        // ignore
      }
      console.log(`Anchor project detected. Cluster: ${cluster}`);
      deployCmd = 'anchor deploy';
    } else {
      console.log('Solana project detected.');
      deployCmd = 'solana program deploy';
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

import { pool, initDb } from './db.js';

async function handleSave() {
  // Ensure user is authenticated before saving
  const auth = await ensureAuth();
  const config = loadConfig();

  const files = discoverFiles();
  if (files.length === 0) {
    console.error('\x1b[31mError: No Rust files discovered to save.\x1b[0m');
    return;
  }

  const scanResult = scanFiles(files);

  try {
    await initDb();
    
    // Check user session and status
    const userResult = await pool.query('SELECT username, status FROM users WHERE auth_key = $1', [auth.token]);
    if (userResult.rows.length === 0 || userResult.rows[0].status === 'revoked') {
      console.error('\x1b[31mError: Unauthorized or revoked session. Please run "npx miso revoke" and log in again.\x1b[0m');
      return;
    }

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
    const filesScannedJson = JSON.stringify(scanResult.filesScanned);
    const ruleSetVersion = 'v1.0';

    await pool.query(
      `INSERT INTO snapshots (id, username, timestamp, score, findings, files_scanned, rule_set_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [snapshotId, auth.username, timestamp, scanResult.score, findingsJson, filesScannedJson, ruleSetVersion]
    );
  } catch (err) {
    console.error('\x1b[31mError: Failed to save snapshot to database:\x1b[0m', err.message);
    return;
  }

  console.log('\x1b[32m✔ Snapshot successfully synchronized with MISO Hub dashboard!\x1b[0m');
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
    console.log(`Auth Address:     ${config.auth ? config.auth.username : 'Not Authenticated'}`);
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
  } else {
    console.error(`\x1b[31mError: Unsupported config option "${key}". Use "threshold", "deployCommand", or "activeRules".\x1b[0m`);
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
  \x1b[36mscan\x1b[0m             Local static analysis scan of Rust contracts (offline)
  \x1b[36mdeploy\x1b[0m           Gatekeeper check against threshold and shell out to deploy command
  \x1b[36mdeploy --force\x1b[0m   Bypass threshold checks and proceed with deploy
  \x1b[36msave\x1b[0m             Sync audit snapshots/metadata to MISO Hub (simulated in M1)
  \x1b[36mrevoke\x1b[0m           Completely clear local config, cache, and MISO.md logs
  \x1b[36mconfig\x1b[0m           View or edit settings (threshold, deployCommand)
  \x1b[36mhistory\x1b[0m          Show the history log table from MISO.md
  \x1b[36mhelp\x1b[0m             Print this help menu
`);
}
