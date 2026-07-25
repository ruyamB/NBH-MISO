import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python bridge script
const RAG_SCRIPT = path.join(__dirname, '..', '..', 'rag', 'retrieval.py');

/**
 * Calls the Python RAG retrieval bridge with a natural language query.
 * Returns an array of retrieved knowledge chunks.
 *
 * @param {string} query  - Natural language query string
 * @param {object} opts   - { k: number, threshold: number }
 * @returns {Promise<Array<{page_content: string, metadata: object}>>}
 */
export async function retrieveFromRAG(query, opts = {}) {
  const k = opts.k || 5;
  const threshold = opts.threshold || 0.4;

  return new Promise((resolve) => {
    // Try 'python3' first, fall back to 'python'
    const trySpawn = (pythonCmd) => {
      const child = spawn(pythonCmd, [
        RAG_SCRIPT,
        '--query', query,
        '--k', String(k),
        '--threshold', String(threshold)
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        // Run from project root so .env can be found
        cwd: path.join(__dirname, '..', '..')
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        try {
          const result = JSON.parse(stdout.trim());

          if (result.error) {
            console.warn(`\x1b[33m[RAG] Warning: ${result.message}\x1b[0m`);
            resolve([]);
            return;
          }

          resolve(result.docs || []);
        } catch (parseErr) {
          // stdout wasn't valid JSON — likely a Python crash
          if (pythonCmd === 'python3') {
            // Retry with 'python'
            trySpawn('python');
          } else {
            console.warn(`\x1b[33m[RAG] Could not parse retrieval output. RAG disabled for this run.\x1b[0m`);
            if (stderr) console.warn(`\x1b[33m[RAG] stderr: ${stderr.slice(0, 300)}\x1b[0m`);
            resolve([]);
          }
        }
      });

      child.on('error', () => {
        if (pythonCmd === 'python3') {
          trySpawn('python');
        } else {
          console.warn('\x1b[33m[RAG] Python not found. RAG disabled for this run.\x1b[0m');
          resolve([]);
        }
      });
    };

    trySpawn('python3');
  });
}

/**
 * Formats retrieved RAG docs into a condensed context string for LLM injection.
 *
 * @param {Array} docs - Retrieved docs from retrieveFromRAG()
 * @returns {string}
 */
export function formatRAGContext(docs) {
  if (!docs || docs.length === 0) {
    return 'No relevant security knowledge retrieved from the RAG knowledge base.';
  }

  return docs.map((doc, i) => {
    const m = doc.metadata || {};
    const header = [
      `[${i + 1}] ${m.vulnerability_id || '?'} — ${m.vulnerability_name || '?'}`,
      `    Category: ${m.category || '?'} | Severity: ${m.severity || '?'} | Confidence: ${m.confidence || '?'}`,
    ].join('\n');
    const content = (doc.page_content || '').slice(0, 800);
    return `${header}\n\n${content}`;
  }).join('\n\n' + '─'.repeat(60) + '\n\n');
}
