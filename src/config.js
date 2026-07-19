import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { pool, initDb } from './db.js';

const DEFAULT_CONFIG = {
  threshold: 90,
  deployCommand: '',
  activeRules: ['default'],
  auth: null
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

// Triggers authentication on first run of `scan` per project
export async function ensureAuth() {
  const config = loadConfig();
  if (config.auth && config.auth.username) {
    return config.auth;
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
