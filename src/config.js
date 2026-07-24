import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { pool, initDb } from './db.js';

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
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function deleteConfig() {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
  if (fs.existsSync(dir)) {
    try {
      fs.rmdirSync(dir);
    } catch (e) {
      // Ignore if dir is not empty
    }
  }
}

// Prompt utility for terminal input
export function promptUser(query, hideInput = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hideInput) {
      // Minimal password masking in Node CLI
      const stdin = process.stdin;
      const stdout = process.stdout;
      
      stdout.write(query);
      
      // Temporary handler to suppress echo of characters
      const onData = (char) => {
        char = char.toString();
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // End of transmission
            stdin.removeListener('data', onData);
            break;
          default:
            // Write a backspace and asterisk or nothing (nothing is standard for unix, let's write backspace to hide)
            stdout.write('\x1B[2K\x1B[200D' + query + '*'.repeat(rl.line.length));
            break;
        }
      };
      
      stdin.on('data', onData);
      
      rl.question('', (answer) => {
        rl.close();
        console.log(); // Print new line
        resolve(answer);
      });
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Interactive Up/Down Arrow key menu selector for terminal CLI.
 */
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
      choices.forEach((choice, index) => {
        if (index === selectedIndex) {
          stdout.write(`  \x1b[36m❯ ${choice.label}\x1b[0m\n`);
        } else {
          stdout.write(`    ${choice.label}\n`);
        }
      });
    };

    const cleanup = () => {
      stdout.write('\x1B[?25h');
      if (stdin.isRaw) {
        stdin.setRawMode(false);
      }
      stdin.removeListener('keypress', onKeyPress);
    };

    readline.emitKeypressEvents(stdin);
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
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

// Triggers authentication on first run of `scan` per project
export async function ensureAuth() {
  const config = loadConfig();
  if (config.auth && config.auth.username) {
    return config.auth;
  }
  if (process.env.MISO_TEST === 'true') {
    return { username: 'testuser', token: 'testpassword' };
  }

  console.log('\x1b[36m--- MISO Hub Account Registration / Login ---\x1b[0m');
  console.log('Required once per project to cache local session.');

  const usernameInput = await promptUser('Username (Address): ');
  const passwordInput = await promptUser('Password: ', true);

  const username = usernameInput.trim();
  const password = passwordInput.trim();

  if (!username || !password) {
    console.error('\x1b[31mError: Username and password cannot be empty.\x1b[0m');
    process.exit(1);
  }

  let finalUsername, finalToken;

  try {
    // Ensure tables exist
    await initDb();

    // Check if user exists
    const userResult = await pool.query(
      'SELECT username, auth_key, sign_in_count, status FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length > 0) {
      // User found -> Signing in
      const user = userResult.rows[0];
      if (user.auth_key !== password) {
        console.error('\x1b[31mError: Authentication failed: Invalid password\x1b[0m');
        process.exit(1);
      }

      // Increment sign-in count and reset status to active
      const newSignInCount = (user.sign_in_count || 0) + 1;
      await pool.query(
        "UPDATE users SET sign_in_count = $1, status = 'active' WHERE username = $2",
        [newSignInCount, username]
      );

      finalUsername = user.username;
      finalToken = user.auth_key; // Using auth_key as the local session token
      console.log(`\x1b[32m✔ Logged in successfully (Sign-in count: ${newSignInCount})\x1b[0m`);
    } else {
      // User not found -> Registering
      await pool.query(
        "INSERT INTO users (username, auth_key, sign_in_count, status) VALUES ($1, $2, 1, 'active')",
        [username, password]
      );

      finalUsername = username;
      finalToken = password; // Using auth_key as the local session token
      console.log('\x1b[32m✔ Welcome! Registered successfully\x1b[0m');
    }
  } catch (err) {
    console.error('\x1b[31mError connecting to database:\x1b[0m', err.message);
    process.exit(1);
  }

  config.auth = {
    username: finalUsername,
    token: finalToken
  };

  saveConfig(config);
  console.log('\x1b[32m✔ Session cached in .miso/config.json\x1b[0m\n');
  return config.auth;
}

// Project linking functionality for Hub integration
export async function linkProject(config) {
  try {
    await initDb();
    await pool.query('SELECT NOW()');
    console.log('\x1b[32m✔ Connected successfully to MISO Hub Database!\x1b[0m');
    return true;
  } catch (err) {
    console.error('\x1b[31mError: Could not connect to Neon database.\x1b[0m', err.message);
    return false;
  }
}

function isPlaceholderKey(key) {
  if (!key) return true;
  const k = key.trim().toUpperCase();
  return k.includes('YOUR_SECRET') || k.includes('PASTE_YOUR') || k.includes('YOUR_GEMINI') || k.includes('YOUR_KEY');
}

/**
 * Ensures Groq or Gemini API key or user mode preference is established before scanning.
 */
export async function ensureApiKeyOrChoice() {
  const config = loadConfig();
  const groqEnv = process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY || '';
  const geminiEnv = process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY || '';

  if (groqEnv && !isPlaceholderKey(groqEnv)) {
    return { apiKey: groqEnv, provider: 'groq', staticOnly: false };
  }

  if (config.groqApiKey && !isPlaceholderKey(config.groqApiKey)) {
    return { apiKey: config.groqApiKey, provider: 'groq', staticOnly: false };
  }

  if (geminiEnv && !isPlaceholderKey(geminiEnv)) {
    return { apiKey: geminiEnv, provider: 'gemini', staticOnly: false };
  }

  if (config.geminiApiKey && !isPlaceholderKey(config.geminiApiKey)) {
    return { apiKey: config.geminiApiKey, provider: 'gemini', staticOnly: false };
  }

  if (process.env.MISO_TEST === 'true') {
    return { apiKey: '', provider: 'mock', staticOnly: false };
  }

  while (true) {
    console.log('\n\x1b[36m--- MISO AI Security Scanner Setup ---\x1b[0m');
    const hasKey = await promptUser('Do you have your own Groq or Gemini API Key for AI scanning? (y/N): ');
    const normalizedHasKey = hasKey.trim().toLowerCase();

    if (normalizedHasKey === 'y' || normalizedHasKey === 'yes') {
      const apiKeyInput = await promptUser('Enter your Groq (gsk_...) or Gemini (AIzaSy...) API Key: ', true);
      const apiKey = apiKeyInput.trim();
      if (!apiKey) {
        console.log('\x1b[31mError: API Key cannot be empty. Please try again.\x1b[0m');
        continue;
      }

      let provider = 'gemini';
      if (apiKey.startsWith('gsk_')) {
        provider = 'groq';
        config.groqApiKey = apiKey;
        process.env.GROQ_API_KEY = apiKey;
        console.log('\x1b[32m✔ User Groq API Key saved to local configuration.\x1b[0m\n');
      } else {
        provider = 'gemini';
        config.geminiApiKey = apiKey;
        process.env.GEMINI_API_KEY = apiKey;
        console.log('\x1b[32m✔ User Gemini API Key saved to local configuration.\x1b[0m\n');
      }

      config.allowStaticOnly = false;
      saveConfig(config);
      return { apiKey, provider, staticOnly: false };
    } else {
      console.log('\x1b[33m\nWarning: Static-only analysis is not recommended. It may miss complex logic or security vulnerabilities.\x1b[0m');
      const confirmStatic = await promptUser('Are you okay with proceeding with static analysis only? (y/N): ');
      const normalizedConfirm = confirmStatic.trim().toLowerCase();

      if (normalizedConfirm === 'y' || normalizedConfirm === 'yes') {
        config.allowStaticOnly = true;
        saveConfig(config);
        console.log('\x1b[33mProceeding with static analysis scan...\x1b[0m\n');
        return { apiKey: '', provider: 'none', staticOnly: true };
      } else {
        console.log('Returning to API key setup prompt...');
      }
    }
  }
}

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
  if (apiKey && config.lastScanTokenUsage && config.lastScanTokenUsage[apiKey] !== undefined) {
    return config.lastScanTokenUsage[apiKey];
  }
  if (typeof config.lastScanTokens === 'number') {
    return config.lastScanTokens;
  }
  return 0;
}

export function getTokenUsage(apiKey) {
  if (!apiKey) return 0;
  const config = loadConfig();
  return config.tokenUsage?.[apiKey] || 0;
}

