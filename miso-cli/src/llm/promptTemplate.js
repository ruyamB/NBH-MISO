import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the canonical MISO AI patch prompt template
const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates', 'prompts', 'miso_patch_prompt.txt');

let _cachedTemplate = null;

function loadTemplate() {
  if (_cachedTemplate) return _cachedTemplate;
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`MISO patch prompt template not found at: ${TEMPLATE_PATH}`);
  }
  _cachedTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return _cachedTemplate;
}

/**
 * Fills the MISO AI patch prompt template with the four input slots.
 *
 * @param {object} params
 * @param {string} params.originalCode      - Full source of the Rust contract file
 * @param {string} params.vulnerability     - Natural language query (from queryBuilder)
 * @param {string} params.ruleAnalysis      - Formatted string of the scan findings for this file
 * @param {string} params.retrievedContext  - Retrieved RAG knowledge chunks (from formatRAGContext)
 * @returns {string} - Fully assembled prompt string ready to send to the LLM
 */
export function buildPatchPrompt({ originalCode, vulnerability, ruleAnalysis, retrievedContext }) {
  const template = loadTemplate();

  return template
    .replace('{{original_code}}', originalCode || '(no source available)')
    .replace('{{vulnerability}}', vulnerability || '(no vulnerability query provided)')
    .replace('{{rule_analysis}}', ruleAnalysis || '(no rule engine analysis provided)')
    .replace('{{retrieved_context}}', retrievedContext || 'No relevant security knowledge retrieved.');
}

/**
 * Formats a findings array into a readable rule analysis string for the prompt.
 *
 * @param {Array} findings - Findings from engine.js for a specific file
 * @returns {string}
 */
export function formatRuleAnalysis(findings) {
  if (!findings || findings.length === 0) return 'No findings from the MISO rule engine.';

  return findings.map((f, i) =>
    [
      `[${i + 1}] Rule: ${f.ruleId}`,
      `    Severity:   ${f.severity}`,
      `    Location:   ${f.file}:${f.line}`,
      `    Details:    ${f.details}`,
      `    Fix Hint:   ${f.recommendation}`,
    ].join('\n')
  ).join('\n\n');
}
