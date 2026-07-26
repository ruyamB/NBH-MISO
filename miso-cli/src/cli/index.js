import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleScan }   from './scan.js';
import { handleDeploy } from './deploy.js';
import { handleSave }   from './save.js';
import { handlePatch }  from './patch.js';
import { handleCreate } from './create.js';
import { handleRmKey }  from './rmkey.js';
import { handleWhoAmI } from './whoami.js';
import {
  loadConfig, saveConfig, deleteConfig,
  ensureAuth, promptUser, getConfigPath, getRecentTokenUsage
} from '../config.js';
import { pool, initDb } from '../db.js';
import { displayResults, getPreviousScore } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────

export async function runCLI() {
  const args    = process.argv.slice(2);
  const command = args[0] || 'help';

  // provider-<key> shorthand
  if (command.startsWith('provider-')) {
    await handleProviderKey(command.slice(9).trim());
    return;
  }

  switch (command) {
    case 'create':
      await handleCreate(args.slice(1));
      break;

    case 'rmkey':
      handleRmKey(args.slice(1));
      break;

    case 'whoami':
      handleWhoAmI();
      break;

    case 'scan':
      await handleScan(args.slice(1));
      break;

    case 'patch':
      await handlePatch(args.slice(1));
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

    case 'usage':
      handleUsage(args.slice(1));
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

// ── Utility handlers ──────────────────────────────────────────────────────

function handleVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  console.log(packageJson.version);
}

function handleUsage(options = []) {
  const config = loadConfig();
  const specifiedKey = options[0]?.trim() || '';
  const apiKey = specifiedKey || process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY
    || process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY
    || config.groqApiKey || config.geminiApiKey || '';
  console.log(getRecentTokenUsage(apiKey));
}

async function handleDev() {
  let username = 'testuser';
  let issue    = 'test issue';

  if (process.env.MISO_TEST !== 'true') {
    username = await promptUser('Username: ');
    issue    = await promptUser('Issue: ');
  }
  try {
    await initDb();
    await pool.query(`INSERT INTO developer_issues (username, issue) VALUES ($1, $2)`, [username, issue]);
  } catch (_) {}
  console.log('\x1b[32m✔ Your issue has been sent to the developer section.\x1b[0m');
}

async function handleRevoke(options = []) {
  const mdPath     = path.join(process.cwd(), 'MISO.md');
  const configPath = getConfigPath();

  if (!fs.existsSync(mdPath) && !fs.existsSync(configPath)) {
    console.log('\x1b[31mNo local configuration or MISO.md found to revoke.\x1b[0m');
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
  if (config.auth?.username) {
    try {
      await initDb();
      await pool.query('DELETE FROM snapshots WHERE username=$1', [config.auth.username]);
      await pool.query("UPDATE users SET status='revoked' WHERE username=$1", [config.auth.username]);
    } catch (err) {
      console.error('\x1b[31mWarning: Could not update remote status:\x1b[0m', err.message);
    }
  }

  deleteConfig();
  if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);

  console.log('\x1b[32m✔ Local config files and credentials wiped.\x1b[0m');
  console.log('\x1b[32m✔ MISO.md local audit trail deleted.\x1b[0m');
  console.log('\x1b[32m✔ All remote MISO Hub snapshots permanently deleted.\x1b[0m');
}

function handleConfig(options = []) {
  const config = loadConfig();
  if (options.length === 0) {
    console.log('\n\x1b[1m--- MISO Configuration ---\x1b[0m');
    console.log(`Gating Threshold: ${config.threshold}/100`);
    console.log(`Deploy Command:   ${config.deployCommand || '(default: anchor deploy / solana program deploy)'}`);
    console.log(`Active Rules:     ${config.activeRules.join(', ')}`);
    console.log(`Gemini API Key:   ${config.geminiApiKey ? '****' + config.geminiApiKey.slice(-4) : '(not set)'}`);
    console.log(`Auth Address:     ${config.auth ? config.auth.username : 'Not Authenticated'}`);
    console.log();
    return;
  }

  const key = options[0];
  const val = options.slice(1).join(' ');

  if (key === 'threshold') {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 100) { console.error('\x1b[31mError: Threshold must be 0–100.\x1b[0m'); return; }
    config.threshold = num;
    saveConfig(config);
    console.log(`\x1b[32m✔ Threshold updated to ${num}/100\x1b[0m`);
  } else if (key === 'deployCommand') {
    config.deployCommand = val;
    saveConfig(config);
    console.log(`\x1b[32m✔ Deploy command set to "${val}"\x1b[0m`);
  } else if (key === 'activeRules') {
    const rules = val.split(',').map(r => r.trim()).filter(Boolean);
    if (rules.length === 0) { console.error('\x1b[31mError: Active rules cannot be empty.\x1b[0m'); return; }
    config.activeRules = rules;
    saveConfig(config);
    console.log(`\x1b[32m✔ Active rules updated to "${rules.join(', ')}"\x1b[0m`);
  } else if (key === 'geminiApiKey') {
    config.geminiApiKey = val;
    saveConfig(config);
    console.log('\x1b[32m✔ Gemini API Key saved.\x1b[0m');
  } else {
    console.error(`\x1b[31mError: Unsupported config option "${key}".\x1b[0m`);
  }
}

function handleHistory() {
  const filePath = path.join(process.cwd(), 'MISO.md');
  if (!fs.existsSync(filePath)) {
    console.log('\x1b[33mNo scan history found (MISO.md does not exist).\x1b[0m');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const runRegex = /## Run — (.*?)\n\*\*Confidence Score:\*\*\s+(\d+)\/100.*?\n\*\*Rule Set Version:\*\*\s+(.*?)\n\*\*Files Scanned:\*\*\s+(.*?)\n/g;
  const matches = [...content.matchAll(runRegex)];
  if (matches.length === 0) { console.log('\x1b[33mNo readable history logs found in MISO.md.\x1b[0m'); return; }

  console.log('\n\x1b[1m--- MISO Scan History ---\x1b[0m');
  console.log(`${'Date/Time (UTC)'.padEnd(20)} | ${'Score'.padEnd(8)} | ${'Rules'.padEnd(8)} | Files`);
  console.log('-'.repeat(80));
  for (const match of matches) {
    console.log(`${match[1].padEnd(20)} | ${match[2].padEnd(8)} | ${match[3].padEnd(8)} | ${match[4]}`);
  }
  console.log();
}

async function handleProviderKey(key) {
  let apiKey = key;
  if (!apiKey) {
    apiKey = (await promptUser('Enter your Groq (gsk_...) or Gemini (AIza...) API Key: ', true)).trim();
  }
  if (!apiKey) { console.error('\x1b[31mError: API Key cannot be empty.\x1b[0m'); return; }

  const config = loadConfig();
  if (apiKey.startsWith('gsk_')) {
    config.groqApiKey = apiKey;
    process.env.GROQ_API_KEY = apiKey;
    console.log('\x1b[32m✔ Groq API Key configured!\x1b[0m');
  } else {
    config.geminiApiKey = apiKey;
    process.env.GEMINI_API_KEY = apiKey;
    console.log('\x1b[32m✔ Gemini API Key configured!\x1b[0m');
  }
  config.allowStaticOnly = false;
  saveConfig(config);
  console.log(`Masked Key: ****${apiKey.slice(-4)}\n`);
}

function displayHelp() {
  console.log(`
\x1b[1mUsage:\x1b[0m  miso <command> [options]

\x1b[1mCore Commands:\x1b[0m
  \x1b[36mcreate\x1b[0m                 Create a Solana Rust smart contract file (target confidence score: 30-50/100)
  \x1b[36mscan\x1b[0m                   Static + AI scan of Rust contracts → MISO.md
  \x1b[36mscan --file <path>\x1b[0m     Scan specific file(s) only
  \x1b[36mscan --provider <groq|gemini>\x1b[0m Force a specific AI provider for scan
  \x1b[36mpatch\x1b[0m                  RAG-powered AI auto-patcher (VS Code-style terminal suggestions)
  \x1b[36mpatch --file <path>\x1b[0m    Patch specific file(s) only
  \x1b[36mpatch --provider <groq|gemini>\x1b[0m Force a specific AI provider for patch generation
  \x1b[36mdeploy\x1b[0m                 Security-gated deploy to Solana devnet
  \x1b[36mdeploy --force\x1b[0m         Bypass threshold and deploy anyway
  \x1b[36msave\x1b[0m                   Sync audit snapshots to MISO Hub

\x1b[1mConfiguration:\x1b[0m
  \x1b[36mprovider-<key>\x1b[0m         Set Groq (gsk_...) or Gemini (AIza...) API Key
  \x1b[36mrmkey --<gemini|grok>\x1b[0m  Remove current Gemini or Grok API key (re-prompts on next scan)
  \x1b[36mconfig\x1b[0m                 View current MISO settings
  \x1b[36mconfig threshold <n>\x1b[0m   Set deploy threshold (0–100)
  \x1b[36mconfig geminiApiKey <k>\x1b[0m Set Gemini API key

\x1b[1mUtilities:\x1b[0m
  \x1b[36mwhoami\x1b[0m                 Print current logged-in username (or NULL : do login)
  \x1b[36mhistory\x1b[0m                Show scan history from MISO.md
  \x1b[36musage [key]\x1b[0m            Show token consumption from last scan
  \x1b[36mrevoke\x1b[0m                 Wipe all local MISO config, cache, and MISO.md
  \x1b[36mdev\x1b[0m                    Report an issue to MISO developers
  \x1b[36mhelp\x1b[0m                   Show this help menu
  \x1b[36m--version, -v\x1b[0m          Print version

\x1b[1mPatch Pipeline:\x1b[0m
  miso patch runs:  Scan → AI Query → RAG → LLM → Diff → Apply → Re-scan
  Requires GOOGLE_API_KEY or GEMINI_API_KEY in .env or via \`miso provider-<key>\`
  Python 3.10+ with langchain-chroma + langchain-google-genai required for RAG.
`);
}
