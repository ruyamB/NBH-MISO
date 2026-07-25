import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { pool, initDb } from './db.js';

// Automatically load .env file into process.env if present
export function loadEnvFile() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const idx = trimmed.indexOf('=');
          const rawKey = trimmed.slice(0, idx).trim();
          const rawVal = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (rawKey && rawVal && !process.env[rawKey]) {
            process.env[rawKey] = rawVal;
          }
        }
      } catch (e) {}
    }
  }
}

// Initial execution on import
loadEnvFile();

const DEFAULT_CONFIG = {
  threshold: 90,
  deployCommand: '',
  activeRules: ['default'],
  geminiApiKey: '',
  groqApiKey: '',
  allowStaticOnly: false,
  auth: null,
  tokenUsage: {},
  lastScanTokenUsage: {},
  lastScanTokens: 0
};

export function getConfigPath() {
  return path.join(process.cwd(), '.miso', 'config.json');
}

export function loadConfig() {
  loadEnvFile();
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function deleteConfig() {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  if (fs.existsSync(dir)) {
    try { fs.rmdirSync(dir); } catch (_) {}
  }
}

// ── Terminal prompt utilities ──────────────────────────────────────────────

export function promptUser(query, hideInput = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (hideInput) {
      const stdin = process.stdin;
      const stdout = process.stdout;
      stdout.write(query);

      const onData = (char) => {
        char = char.toString();
        switch (char) {
          case '\n': case '\r': case '\u0004':
            stdin.removeListener('data', onData);
            break;
          default:
            stdout.write('\x1B[2K\x1B[200D' + query + '*'.repeat(rl.line.length));
        }
      };
      stdin.on('data', onData);
      rl.question('', (answer) => { rl.close(); console.log(); resolve(answer); });
    } else {
      rl.question(query, (answer) => { rl.close(); resolve(answer); });
    }
  });
}

export function promptSelect(title, choices, defaultIndex = 0) {
  return new Promise((resolve) => {
    if (process.env.MISO_TEST === 'true' || !process.stdin.isTTY) {
      resolve(choices[defaultIndex].value);
      return;
    }

    let selectedIndex = defaultIndex;
    const stdin = process.stdin;
    const stdout = process.stdout;

    const render = () => {
      stdout.write('\x1B[?25l');
      stdout.write(`\x1b[1m${title}\x1b[0m (Use ↑/↓ arrow keys and press Enter):\n`);
      choices.forEach((choice, i) => {
        stdout.write(i === selectedIndex
          ? `  \x1b[36m❯ ${choice.label}\x1b[0m\n`
          : `    ${choice.label}\n`);
      });
    };

    const cleanup = () => {
      stdout.write('\x1B[?25h');
      if (stdin.isRaw) stdin.setRawMode(false);
      stdin.removeListener('keypress', onKeyPress);
    };

    readline.emitKeypressEvents(stdin);
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();

    const onKeyPress = (str, key) => {
      if (!key) return;
      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = (selectedIndex - 1 + choices.length) % choices.length;
        stdout.write(`\x1B[${choices.length + 1}A\x1B[0J`);
        render();
      } else if (key.name === 'down' || key.name === 'j') {
        selectedIndex = (selectedIndex + 1) % choices.length;
        stdout.write(`\x1B[${choices.length + 1}A\x1B[0J`);
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        console.log(`Selected: \x1b[36m${choices[selectedIndex].label}\x1b[0m\n`);
        resolve(choices[selectedIndex].value);
      } else if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }
    };

    stdin.on('keypress', onKeyPress);
    render();
  });
}

// ── Authentication ─────────────────────────────────────────────────────────

export async function ensureAuth() {
  const config = loadConfig();
  if (config.auth?.username) return config.auth;
  if (process.env.MISO_TEST === 'true') return { username: 'testuser', token: 'testpassword' };

  console.log('\x1b[36m--- MISO Hub Account Registration / Login ---\x1b[0m');
  console.log('Required once per project to cache local session.\n');

  const username = (await promptUser('Username (Address): ')).trim();
  const password = (await promptUser('Password: ', true)).trim();

  if (!username || !password) {
    console.error('\x1b[31mError: Username and password cannot be empty.\x1b[0m');
    process.exit(1);
  }

  let finalUsername, finalToken;
  try {
    await initDb();
    const userResult = await pool.query(
      'SELECT username, auth_key, sign_in_count, status FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (user.auth_key !== password) {
        console.error('\x1b[31mError: Authentication failed: Invalid password\x1b[0m');
        process.exit(1);
      }
      const newCount = (user.sign_in_count || 0) + 1;
      await pool.query("UPDATE users SET sign_in_count=$1, status='active' WHERE username=$2", [newCount, username]);
      finalUsername = user.username;
      finalToken = user.auth_key;
      console.log(`\x1b[32m✔ Logged in successfully (Sign-in count: ${newCount})\x1b[0m`);
    } else {
      await pool.query("INSERT INTO users (username,auth_key,sign_in_count,status) VALUES ($1,$2,1,'active')", [username, password]);
      finalUsername = username;
      finalToken = password;
      console.log('\x1b[32m✔ Welcome! Registered successfully\x1b[0m');
    }
  } catch (err) {
    console.error('\x1b[31mError connecting to database:\x1b[0m', err.message);
    process.exit(1);
  }

  config.auth = { username: finalUsername, token: finalToken };
  saveConfig(config);
  console.log('\x1b[32m✔ Session cached in .miso/config.json\x1b[0m\n');
  return config.auth;
}

// ── API Key resolution ─────────────────────────────────────────────────────

function isPlaceholderKey(key) {
  if (!key) return true;
  const k = key.trim().toUpperCase();
  return k.includes('YOUR_SECRET') || k.includes('PASTE_YOUR') || k.includes('YOUR_GEMINI') || k.includes('YOUR_KEY');
}

export async function ensureApiKeyOrChoice() {
  loadEnvFile();
  const config = loadConfig();
  const groqEnv    = process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY || '';
  const geminiEnv  = process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY || '';
  const googleEnv  = process.env.GOOGLE_API_KEY || '';

  // Prefer Groq if available
  if (groqEnv && !isPlaceholderKey(groqEnv)) return { apiKey: groqEnv, provider: 'groq', staticOnly: false };
  if (config.groqApiKey && !isPlaceholderKey(config.groqApiKey)) return { apiKey: config.groqApiKey, provider: 'groq', staticOnly: false };

  // Fallback to Gemini
  if (geminiEnv && !isPlaceholderKey(geminiEnv)) return { apiKey: geminiEnv, provider: 'gemini', staticOnly: false };
  if (googleEnv && !isPlaceholderKey(googleEnv)) return { apiKey: googleEnv, provider: 'gemini', staticOnly: false };
  if (config.geminiApiKey && !isPlaceholderKey(config.geminiApiKey)) return { apiKey: config.geminiApiKey, provider: 'gemini', staticOnly: false };

  if (process.env.MISO_TEST === 'true') return { apiKey: '', provider: 'mock', staticOnly: false };

  while (true) {
    console.log('\n\x1b[36m--- MISO AI Security Scanner Setup ---\x1b[0m');
    const hasKey = (await promptUser('Do you have your own Groq or Gemini API Key for AI scanning? (y/N): ')).trim().toLowerCase();

    if (hasKey === 'y' || hasKey === 'yes') {
      const apiKey = (await promptUser('Enter your Groq (gsk_...) or Gemini (AIzaSy...) API Key: ', true)).trim();
      if (!apiKey) { console.log('\x1b[31mError: API Key cannot be empty.\x1b[0m'); continue; }

      if (apiKey.startsWith('gsk_')) {
        config.groqApiKey = apiKey;
        process.env.GROQ_API_KEY = apiKey;
        console.log('\x1b[32m✔ User Groq API Key saved.\x1b[0m\n');
        saveConfig(config);
        return { apiKey, provider: 'groq', staticOnly: false };
      } else {
        config.geminiApiKey = apiKey;
        process.env.GEMINI_API_KEY = apiKey;
        console.log('\x1b[32m✔ User Gemini API Key saved.\x1b[0m\n');
        saveConfig(config);
        return { apiKey, provider: 'gemini', staticOnly: false };
      }
    } else {
      console.log('\x1b[33m\nWarning: Static-only analysis may miss complex vulnerabilities.\x1b[0m');
      const confirmStatic = (await promptUser('Proceed with static analysis only? (y/N): ')).trim().toLowerCase();
      if (confirmStatic === 'y' || confirmStatic === 'yes') {
        config.allowStaticOnly = true;
        saveConfig(config);
        console.log('\x1b[33mProceeding with static analysis...\x1b[0m\n');
        return { apiKey: '', provider: 'none', staticOnly: true };
      }
    }
  }
}

// ── Token usage tracking ───────────────────────────────────────────────────

export function recordTokenUsage(apiKey, tokens) {
  if (typeof tokens !== 'number') return;
  const config = loadConfig();
  if (!config.tokenUsage) config.tokenUsage = {};
  if (!config.lastScanTokenUsage) config.lastScanTokenUsage = {};
  if (apiKey) {
    config.tokenUsage[apiKey] = (config.tokenUsage[apiKey] || 0) + tokens;
    config.lastScanTokenUsage[apiKey] = tokens;
  }
  config.lastScanTokens = tokens;
  saveConfig(config);
}

export function getRecentTokenUsage(apiKey) {
  const config = loadConfig();
  if (apiKey && config.lastScanTokenUsage?.[apiKey] !== undefined) return config.lastScanTokenUsage[apiKey];
  return config.lastScanTokens || 0;
}

export function getTokenUsage(apiKey) {
  if (!apiKey) return 0;
  return loadConfig().tokenUsage?.[apiKey] || 0;
}
