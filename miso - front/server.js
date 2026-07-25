import express from 'express';
import cors from 'cors';
import pg from 'pg';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env.local') });

const app = express();
app.use(cors());
app.use(express.json());

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString: connectionString,
});

// Initialize database tables
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
        auth_key VARCHAR(255) NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_versions (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) REFERENCES users(username) ON DELETE CASCADE,
        version VARCHAR(255) NOT NULL,
        deployed_at VARCHAR(255) NOT NULL,
        audit_score INT NOT NULL,
        commit_hash VARCHAR(255) NOT NULL,
        verified_by VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL,
        code_snippet TEXT NOT NULL
      );
    `);
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization failed", err);
  } finally {
    client.release();
  }
}

initDb();

// Check if user exists
app.get('/api/users/check/:username', async (req, res) => {
  const username = req.params.username.trim();
  try {
    const result = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Verify login credentials
app.post('/api/users/login', async (req, res) => {
  const { username, auth_key } = req.body;
  if (!username || !auth_key) {
    return res.status(400).json({ error: "Username and Auth Key are required" });
  }
  try {
    const cleanUser = username.trim();
    const result = await pool.query("SELECT * FROM users WHERE username = $1 AND auth_key = $2", [cleanUser, auth_key]);
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 1. Get or Create user
app.post('/api/users', async (req, res) => {
  const { username, auth_key } = req.body;
  if (!username || !auth_key) {
    return res.status(400).json({ error: "Username and Auth Key are required" });
  }
  
  try {
    const cleanUser = username.trim();
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [cleanUser]);
    
    if (result.rows.length > 0) {
      // User exists, return the existing user details
      return res.json(result.rows[0]);
    } else {
      // Create user
      const insertResult = await pool.query(
        "INSERT INTO users (username, auth_key) VALUES ($1, $2) RETURNING *",
        [cleanUser, auth_key]
      );
      return res.json(insertResult.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. Fetch versions for user
app.get('/api/versions/:username', async (req, res) => {
  const username = req.params.username.trim();
  try {
    const versionsRes = await pool.query(
      "SELECT * FROM contract_versions WHERE username = $1 ORDER BY id DESC",
      [username]
    );

    const snapshotsRes = await pool.query(
      "SELECT * FROM snapshots WHERE username = $1 ORDER BY timestamp DESC",
      [username]
    );

    const versions = versionsRes.rows;

    // Convert snapshots to contract_version format so all CLI scans show in MISO Hub
    const snapshotVersions = snapshotsRes.rows.map((snap, idx) => {
      const versionTag = snap.contract_version ? (snap.contract_version.startsWith('v') ? snap.contract_version : `v${snap.contract_version}`) : `v1.0.${idx}`;
      const deployedAt = snap.timestamp ? new Date(snap.timestamp).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16);
      const commitHash = snap.id ? snap.id.replace('snap_', '').substring(0, 8) : 'snap0000';

      let codeSnippet = '';
      if (snap.findings) {
        let findingsArr = [];
        try {
          findingsArr = typeof snap.findings === 'string' ? JSON.parse(snap.findings) : snap.findings;
        } catch (e) {}

        if (Array.isArray(findingsArr) && findingsArr.length > 0) {
          codeSnippet += `// Audit Findings Summary (${findingsArr.length} issue(s) detected):\n`;
          findingsArr.forEach((f) => {
            codeSnippet += `// [${f.severity || 'Notice'}] ${f.file || 'contract'}:${f.line || 1} - ${f.details || ''}\n`;
            if (f.recommendation) {
              codeSnippet += `//   Recommendation: ${f.recommendation}\n`;
            }
          });
          codeSnippet += `\n`;
        }
      }
      
      if (snap.files_scanned) {
        let filesArr = [];
        try {
          filesArr = typeof snap.files_scanned === 'string' ? JSON.parse(snap.files_scanned) : snap.files_scanned;
        } catch (e) {}

        if (Array.isArray(filesArr) && filesArr.length > 0) {
          codeSnippet += `// Scanned Files (${filesArr.length}):\n`;
          filesArr.forEach(f => {
            codeSnippet += `// - ${f.path || f.name || 'file'}\n`;
          });
        }
      }
      
      if (!codeSnippet.trim()) {
        codeSnippet = `// Scanned Rust smart contract snapshot (Score: ${snap.score || 100}/100) synced from MISO CLI.`;
      }

      return {
        id: `snap_${snap.id}`,
        username: snap.username,
        version: versionTag,
        deployed_at: deployedAt,
        audit_score: snap.score !== undefined ? snap.score : 95,
        commit_hash: commitHash,
        verified_by: 'MISO Pipeline Validator',
        status: idx === 0 && versions.length === 0 ? 'active' : 'archived',
        code_snippet: codeSnippet
      };
    });

    const existingVersionTags = new Set(versions.map(v => v.version));
    const combined = [...versions];

    for (const sv of snapshotVersions) {
      if (!existingVersionTags.has(sv.version)) {
        combined.push(sv);
        existingVersionTags.add(sv.version);
      }
    }

    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. Add new version
app.post('/api/versions', async (req, res) => {
  const { username, version, deployed_at, audit_score, commit_hash, verified_by, status, code_snippet } = req.body;
  
  try {
    const cleanUser = username.trim();
    
    // Archive old active versions
    if (status === 'active') {
      await pool.query(
        "UPDATE contract_versions SET status = 'archived' WHERE username = $1",
        [cleanUser]
      );
    }

    const result = await pool.query(
      "INSERT INTO contract_versions (username, version, deployed_at, audit_score, commit_hash, verified_by, status, code_snippet) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [cleanUser, version, deployed_at, audit_score, commit_hash, verified_by, status, code_snippet]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
