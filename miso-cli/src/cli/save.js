import fs from 'fs';
import path from 'path';
import { discoverFiles } from '../engine/discovery.js';
import { scanFiles } from '../engine/engine.js';
import { getPreviousScore } from '../utils/logger.js';
import { loadConfig, saveConfig, ensureAuth } from '../config.js';
import { pool as dbPool, initDb as dbInitDb } from '../db.js';

export async function handleSave() {
  const auth = await ensureAuth();
  const config = loadConfig();

  const files = discoverFiles();
  if (files.length === 0) {
    console.error('\x1b[31mError: No Rust files discovered to save.\x1b[0m');
    return;
  }

  const { apiKey } = { apiKey: config.geminiApiKey || config.groqApiKey || '' };
  const scanResult = await scanFiles(files, { apiKey });
  const contractVersion = getContractVersion();

  const snapshotId = `snap_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const findingsJson = JSON.stringify(scanResult.findings.map(f => ({
    ruleId: f.ruleId, severity: f.severity, file: f.file,
    line: f.line, details: f.details, recommendation: f.recommendation
  })));
  const filesScannedDb = files.map(file => ({
    name: path.basename(file),
    path: path.relative(process.cwd(), file).replace(/\\/g, '/'),
    version: contractVersion
  }));
  const filesScannedJson = JSON.stringify(filesScannedDb);
  const ruleSetVersion = 'v1.0';

  // 1. Save locally
  try {
    const localSnapshotsDir = path.join(process.cwd(), '.miso', 'snapshots');
    if (!fs.existsSync(localSnapshotsDir)) fs.mkdirSync(localSnapshotsDir, { recursive: true });

    const contractFiles = [];
    for (const file of files) {
      if (fs.existsSync(file)) {
        contractFiles.push({
          name: path.basename(file),
          path: path.relative(process.cwd(), file).replace(/\\/g, '/'),
          version: contractVersion,
          content: fs.readFileSync(file, 'utf8')
        });
      }
    }
    const snapshotData = { id: snapshotId, username: auth.username, timestamp, score: scanResult.score, findings: scanResult.findings, filesScanned: scanResult.filesScanned, ruleSetVersion, contractVersion, contractFiles };
    const localSnapshotPath = path.join(localSnapshotsDir, `${snapshotId}.json`);
    fs.writeFileSync(localSnapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');
    console.log(`\x1b[32m✔ Snapshot saved locally to ${path.relative(process.cwd(), localSnapshotPath)}\x1b[0m`);
  } catch (err) {
    console.error('\x1b[31mError saving snapshot locally:\x1b[0m', err.message);
  }

  // 2. Sync to DB
  try {
    await dbInitDb();
    const userResult = await dbPool.query('SELECT username, status FROM users WHERE username=$1 AND auth_key=$2', [auth.username, auth.token]);
    if (userResult.rows.length === 0 || userResult.rows[0].status === 'revoked') {
      console.error('\x1b[31mError: Unauthorized or revoked session.\x1b[0m');
      return;
    }
    await dbPool.query(
      `INSERT INTO snapshots (id,username,timestamp,score,findings,files_scanned,rule_set_version,contract_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [snapshotId, auth.username, timestamp, scanResult.score, findingsJson, filesScannedJson, ruleSetVersion, contractVersion]
    );

    let codeSnippet = '';
    for (const file of files) {
      if (fs.existsSync(file)) {
        const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
        codeSnippet += `// File: ${relativePath}\n${fs.readFileSync(file, 'utf8')}\n\n`;
      }
    }
    if (!codeSnippet.trim()) codeSnippet = '// Scanned Rust contract files';

    await dbPool.query("UPDATE contract_versions SET status = 'archived' WHERE username = $1", [auth.username]);

    const versionTag = contractVersion.startsWith('v') ? contractVersion : `v${contractVersion}`;
    const deployedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const commitHash = snapshotId.replace('snap_', '').substring(0, 8);

    await dbPool.query(
      `INSERT INTO contract_versions (username, version, deployed_at, audit_score, commit_hash, verified_by, status, code_snippet)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [auth.username, versionTag, deployedAt, scanResult.score, commitHash, 'MISO Pipeline Validator', 'active', codeSnippet]
    );

    console.log('\x1b[32m✔ Snapshot & contract version synchronized with MISO Hub dashboard!\x1b[0m');
  } catch (err) {
    console.error('\x1b[31mError saving snapshot to database:\x1b[0m', err.message);
  }
}

function getContractVersion() {
  try {
    if (fs.existsSync('Cargo.toml')) {
      const content = fs.readFileSync('Cargo.toml', 'utf8');
      const match = content.match(/version\s*=\s*["']([^"']+)["']/);
      if (match) return match[1];
    }
    if (fs.existsSync('programs')) {
      for (const prog of fs.readdirSync('programs')) {
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
  } catch (_) {}
  return '0.1.0';
}
