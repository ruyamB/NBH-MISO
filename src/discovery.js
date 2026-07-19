import fs from 'fs';
import path from 'path';

// Files/folders always ignored to prevent performance/security issues
const IGNORE_DIRS = new Set(['node_modules', 'target', '.git', '.miso', '.github']);
const SECRET_EXTENSIONS = new Set(['.pem', '.key']);
const SECRET_FILENAMES = new Set(['id.json', 'keypair.json']);

/**
 * Checks if a file is a Solana keypair JSON file.
 * Solana keypair JSONs are flat arrays of 64 integers.
 */
export function isSolanaKeypairFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    // Keypair files are usually small (approx 100-300 bytes)
    if (stats.size > 2000) return false;

    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (content.startsWith('[') && content.endsWith(']')) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length === 64 && parsed.every(val => typeof val === 'number')) {
        return true;
      }
    }
  } catch (e) {
    // Ignore read errors, assume not keypair
  }
  return false;
}

/**
 * Checks if a file or directory path should be excluded based on secret patterns
 */
export function isSecretOrExcluded(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // 1. Check extensions (.pem, .key)
  if (SECRET_EXTENSIONS.has(ext)) {
    return true;
  }

  // 2. Check env files
  if (fileName.startsWith('.env')) {
    return true;
  }

  // 3. Check known secret names
  if (SECRET_FILENAMES.has(fileName.toLowerCase())) {
    return true;
  }

  // 4. Check for Solana keypair signature (64-byte array)
  if (ext === '.json' && isSolanaKeypairFile(filePath)) {
    return true;
  }

  return false;
}

/**
 * Recursively scans directory for files, applying ignore patterns and checking for secrets
 */
function scanDir(dir, foundFiles = []) {
  if (!fs.existsSync(dir)) return foundFiles;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      scanDir(fullPath, foundFiles);
    } else if (entry.isFile()) {
      if (isSecretOrExcluded(fullPath)) {
        continue;
      }
      if (entry.name.endsWith('.rs')) {
        foundFiles.push(fullPath);
      }
    }
  }

  return foundFiles;
}

/**
 * Scans the project directory for Rust source files, taking Anchor config into account.
 */
export function discoverFiles(projectRoot = process.cwd()) {
  const anchorTomlPath = path.join(projectRoot, 'Anchor.toml');
  
  if (fs.existsSync(anchorTomlPath)) {
    // Anchor project: check programs directory first
    const programsPath = path.join(projectRoot, 'programs');
    if (fs.existsSync(programsPath)) {
      return scanDir(programsPath);
    }
  }

  // Fallback to standard recursive scan of the project root
  return scanDir(projectRoot);
}
