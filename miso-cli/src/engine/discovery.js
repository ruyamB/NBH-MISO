import fs from 'fs';
import path from 'path';

const IGNORE_DIRS = new Set(['node_modules', 'target', '.git', '.miso', '.github']);
const SECRET_EXTENSIONS = new Set(['.pem', '.key']);
const SECRET_FILENAMES = new Set(['id.json', 'keypair.json']);

export function isSolanaKeypairFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 2000) return false;
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (content.startsWith('[') && content.endsWith(']')) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length === 64 && parsed.every(v => typeof v === 'number')) return true;
    }
  } catch (e) {}
  return false;
}

export function isSecretOrExcluded(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (SECRET_EXTENSIONS.has(ext)) return true;
  if (fileName.startsWith('.env')) return true;
  if (SECRET_FILENAMES.has(fileName.toLowerCase())) return true;
  if (ext === '.json' && isSolanaKeypairFile(filePath)) return true;
  return false;
}

function scanDir(dir, foundFiles = []) {
  if (!fs.existsSync(dir)) return foundFiles;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      scanDir(fullPath, foundFiles);
    } else if (entry.isFile()) {
      if (isSecretOrExcluded(fullPath)) continue;
      if (entry.name.endsWith('.rs')) foundFiles.push(fullPath);
    }
  }
  return foundFiles;
}

export function discoverFiles(projectRoot = process.cwd()) {
  const anchorTomlPath = path.join(projectRoot, 'Anchor.toml');
  if (fs.existsSync(anchorTomlPath)) {
    const programsPath = path.join(projectRoot, 'programs');
    if (fs.existsSync(programsPath)) return scanDir(programsPath);
  }
  return scanDir(projectRoot);
}
