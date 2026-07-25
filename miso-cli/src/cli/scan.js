import fs from 'fs';
import { discoverFiles } from '../engine/discovery.js';
import { scanFiles } from '../engine/engine.js';
import { displayResults, logToMarkdown } from '../utils/logger.js';
import { ensureApiKeyOrChoice, loadConfig } from '../config.js';
import { promptSelfLearningLoop } from '../learning/prompt.js';

export async function handleScan(args = []) {
  let targetFiles = [];
  const fileArgIdx = args.indexOf('--file');

  if (fileArgIdx !== -1 && args.length > fileArgIdx + 1) {
    targetFiles = args.slice(fileArgIdx + 1);
    console.log('\x1b[36mTargeting specific files for scanning:\x1b[0m', targetFiles.join(', '));
    const invalidFiles = targetFiles.filter(f => !fs.existsSync(f));
    if (invalidFiles.length > 0) {
      console.error('\x1b[31mError: The following files do not exist:\x1b[0m', invalidFiles.join(', '));
      return;
    }
  } else {
    console.log('Discovering Rust files...');
    const files = discoverFiles();
    if (files.length === 0) {
      console.log('\x1b[33mNo Rust (.rs) contracts discovered in the program paths.\x1b[0m');
      return;
    }
    targetFiles = files;
    console.log(`Discovered ${targetFiles.length} Rust file(s). Running static analysis...`);
  }

  const providerArgIdx = args.indexOf('--provider');
  let requestedProvider;
  if (providerArgIdx !== -1 && args.length > providerArgIdx + 1) {
    requestedProvider = args[providerArgIdx + 1].toLowerCase();
    if (!['groq', 'gemini'].includes(requestedProvider)) {
      console.error('\x1b[31mError: Unsupported provider \"' + requestedProvider + '\". Use \"groq\" or \"gemini\".\x1b[0m');
      return;
    }
  }

  const { apiKey, staticOnly, provider: resolvedProvider } = await ensureApiKeyOrChoice();
  let activeApiKey = apiKey;
  const provider = requestedProvider || resolvedProvider;
  if (requestedProvider) {
    const config = loadConfig();
    if (requestedProvider === 'groq') {
      activeApiKey = process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY || config.groqApiKey || '';
      if (!activeApiKey) {
        console.error('\x1b[31mError: No Groq API key available. Set GROQ_API_KEY, MISO_GROQ_API_KEY, or run miso provider-<gsk_...>.\x1b[0m');
        return;
      }
    } else if (requestedProvider === 'gemini') {
      activeApiKey = process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY || config.geminiApiKey || process.env.GOOGLE_API_KEY || '';
      if (!activeApiKey) {
        console.error('\x1b[31mError: No Gemini API key available. Set GEMINI_API_KEY, MISO_GEMINI_API_KEY, GOOGLE_API_KEY, or run miso provider-<AIza...>.\x1b[0m');
        return;
      }
    }
  }

  if (!staticOnly) {
    console.log('Running hybrid AI + Static analysis...');
  } else {
    console.log('Running static analysis only...');
  }

  const result = await scanFiles(targetFiles, { apiKey: activeApiKey, staticOnly });

  displayResults(result);
  logToMarkdown(result);
  console.log('\x1b[32m✔ Scan trail written to local MISO.md\x1b[0m\n');

  const fixableCount = (result.findings || []).filter(f => ['Critical', 'High', 'Medium'].includes(f.severity)).length;
  if (fixableCount > 0 && process.stdin.isTTY && process.env.MISO_TEST !== 'true') {
    const { confirmPrompt } = await import('../utils/interactiveMenu.js');
    const wantImprove = await confirmPrompt('Do you want MISO to improve your contract?', true);
    if (wantImprove) {
      const { handlePatch } = await import('./patch.js');
      await handlePatch(args, { existingScan: result });
      return;
    }
  }

  await promptSelfLearningLoop(result);
}
