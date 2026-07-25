import fs from 'fs';
import path from 'path';

/**
 * Applies the corrected code from an LLM patch response to the target file.
 * Creates a .bak backup before writing.
 *
 * @param {string} filePath       - Absolute path to the Rust file
 * @param {string} correctedCode  - The corrected full file content from the LLM
 * @returns {{ success: boolean, backupPath: string|null, error: string|null }}
 */
export function applyPatch(filePath, correctedCode) {
  if (!fs.existsSync(filePath)) {
    return { success: false, backupPath: null, error: `File not found: ${filePath}` };
  }

  if (!correctedCode || correctedCode.trim().length < 10) {
    return { success: false, backupPath: null, error: 'Corrected code is empty or too short to apply safely.' };
  }

  // Create a timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.miso-backup-${timestamp}.bak`;

  try {
    // Backup original
    fs.copyFileSync(filePath, backupPath);

    // Write corrected code
    fs.writeFileSync(filePath, correctedCode, 'utf8');

    return { success: true, backupPath, error: null };
  } catch (err) {
    // Attempt to restore backup on failure
    try {
      if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, filePath);
    } catch (_) {}
    return { success: false, backupPath: null, error: err.message };
  }
}

/**
 * Restores a file from its .bak backup.
 *
 * @param {string} backupPath - Path to the .bak file
 * @param {string} filePath   - Original file to restore
 * @returns {{ success: boolean, error: string|null }}
 */
export function restoreBackup(backupPath, filePath) {
  try {
    if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup file not found.' };
    fs.copyFileSync(backupPath, filePath);
    fs.unlinkSync(backupPath);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
