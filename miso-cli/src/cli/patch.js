/**
 * MISO AI Auto-Patcher — `miso patch` command
 * =============================================
 *
 * Interactive Workflow:
 *   1. Initial scan (without RAG) → display findings.
 *   2. Prompt: "Do you want MISO to improve your contract? (y/N)"
 *   3. If YES:
 *      a. For each finding: Query RAG knowledge base via ChromaDB bridge.
 *      b. Call LLM with MISO AI patch prompt template + RAG context.
 *      c. Display suggested patch (VS Code-style terminal inline diff). DO NOT automatically change file.
 *      d. Prompt: "Do you want to incorporate these changes into <file>? (y/N)"
 *      e. Apply patch (with backup) if confirmed.
 *   4. After applying changes: Prompt "Would you like to re-scan the contract?" and display updated score.
 */

import fs from 'fs';
import path from 'path';

import { discoverFiles } from '../engine/discovery.js';
import { scanFiles } from '../engine/engine.js';
import { displayResults, logToMarkdown } from '../utils/logger.js';
import { loadConfig, ensureApiKeyOrChoice } from '../config.js';
import { buildAIEnhancedQuery, buildQueryFromFinding } from '../rag/queryBuilder.js';
import { retrieveFromRAG, formatRAGContext } from '../rag/ragBridge.js';
import { buildPatchPrompt, formatRuleAnalysis } from '../llm/promptTemplate.js';
import { callLLMForPatch } from '../llm/llmClient.js';
import { parsePatchResponse } from '../llm/responseParser.js';
import { renderSuggestionPanel, renderStatusPanel } from '../utils/diffRenderer.js';
import { applyPatch } from '../utils/patchApplicator.js';
import { showPatchMenu, confirmPrompt } from '../utils/interactiveMenu.js';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', cyan: '\x1b[36m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', grey: '\x1b[90m',
};

const PATCHABLE_SEVERITIES = new Set(['Medium', 'High', 'Critical']);

export async function handlePatch(cliArgs = [], options = {}) {
  console.log(`\n${C.bold}${C.cyan}━━━  MISO AI Auto-Patcher  ━━━${C.reset}\n`);

  // ── Step 1: Resolve target files ──────────────────────────────────
  let targetFiles = [];
  const fileArgIdx = cliArgs.indexOf('--file');
  if (fileArgIdx !== -1 && cliArgs.length > fileArgIdx + 1) {
    targetFiles = cliArgs.slice(fileArgIdx + 1);
    const invalidFiles = targetFiles.filter(f => !fs.existsSync(f));
    if (invalidFiles.length > 0) {
      console.error(`\x1b[31mError: Files not found: ${invalidFiles.join(', ')}\x1b[0m`);
      return;
    }
    console.log(`${C.cyan}Targeting specific file(s):${C.reset} ${targetFiles.join(', ')}\n`);
  } else {
    targetFiles = discoverFiles();
    if (targetFiles.length === 0) {
      console.log('\x1b[33mNo Rust (.rs) contracts discovered.\x1b[0m');
      return;
    }
  }

  // ── Step 2: Parse provider override and get API key ───────────────
  const providerArgIdx = cliArgs.indexOf('--provider');
  let requestedProvider;
  if (providerArgIdx !== -1 && cliArgs.length > providerArgIdx + 1) {
    requestedProvider = cliArgs[providerArgIdx + 1].toLowerCase();
    if (!['groq', 'gemini'].includes(requestedProvider)) {
      console.error(`\x1b[31mError: Unsupported provider \"${requestedProvider}\". Use \"groq\" or \"gemini\".\x1b[0m`);
      return;
    }
  }

  const { apiKey, staticOnly, provider: resolvedProvider } = await ensureApiKeyOrChoice();
  if (staticOnly || !apiKey) {
    console.error(`${C.red}Error: MISO AI patching requires a Gemini or Groq API key.${C.reset}`);
    console.log(`${C.yellow}Configure API key using: miso provider-<key>${C.reset}`);
    return;
  }

  const provider = requestedProvider || resolvedProvider;
  let activeApiKey = apiKey;
  if (requestedProvider) {
    const config = loadConfig();
    if (requestedProvider === 'groq') {
      activeApiKey = process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY || config.groqApiKey || '';
      if (!activeApiKey) {
        console.error(`${C.red}Error: No Groq API key available. Set GROQ_API_KEY, MISO_GROQ_API_KEY, or run miso provider-<gsk_...>.${C.reset}`);
        return;
      }
    } else if (requestedProvider === 'gemini') {
      activeApiKey = process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY || config.geminiApiKey || process.env.GOOGLE_API_KEY || '';
      if (!activeApiKey) {
        console.error(`${C.red}Error: No Gemini API key available. Set GEMINI_API_KEY, MISO_GEMINI_API_KEY, GOOGLE_API_KEY, or run miso provider-<AIza...>.${C.reset}`);
        return;
      }
    }
  }

  // ── Step 3: Run or retrieve initial scan (without RAG) ────────────
  let initialScan = options.existingScan;
  if (!initialScan) {
    console.log(`${C.bold}Running initial scan...${C.reset}\n`);
    initialScan = await scanFiles(targetFiles, { apiKey: activeApiKey, staticOnly: false, forceFresh: true });
    displayResults(initialScan);
  }

  const patchableFindings = (initialScan.findings || []).filter(f =>
    PATCHABLE_SEVERITIES.has(f.severity)
  );

  if (patchableFindings.length === 0) {
    console.log(`${C.green}✔ No Medium/High/Critical findings detected. No improvements required.${C.reset}\n`);
    return;
  }

  // ── Step 4: Ask user "Do you want MISO to improve your contract?" ──
  if (!options.existingScan && process.stdin.isTTY && process.env.MISO_TEST !== 'true') {
    const wantImprove = await confirmPrompt('Do you want MISO to improve your contract?', true);
    if (!wantImprove) {
      console.log(`${C.grey}Skipping contract improvements.${C.reset}\n`);
      return;
    }
  }

  console.log(`\n${C.bold}${C.cyan}Fetching security knowledge & generating patches for ${patchableFindings.length} issue(s)...${C.reset}\n`);

  // ── Step 5: Group findings by file ───────────────────────────────
  const findingsByFile = new Map();
  for (const finding of patchableFindings) {
    const absPath = targetFiles.find(fp => fp.replace(/\\/g, '/').endsWith(finding.file)) || finding.file;
    if (!findingsByFile.has(absPath)) findingsByFile.set(absPath, []);
    findingsByFile.get(absPath).push(finding);
  }

  const appliedPatches = [];
  const skippedPatches = [];
  let processedCount = 0;
  const totalCount = patchableFindings.length;

  // ── Step 6: RAG Retrieval + LLM Patch Generation + User Decision ─
  for (const [absFilePath, findings] of findingsByFile) {
    let currentSource = '';
    try {
      currentSource = fs.existsSync(absFilePath) ? fs.readFileSync(absFilePath, 'utf8') : '';
    } catch (e) {
      console.warn(`${C.yellow}⚠ Could not read file: ${absFilePath}${C.reset}`);
      continue;
    }

    for (const finding of findings) {
      processedCount++;
      console.log(`\n${C.grey}── Finding ${processedCount}/${totalCount}: [${finding.severity}] ${finding.ruleId} @ ${finding.file}:${finding.line} ──${C.reset}\n`);

      // 6a. RAG Retrieval via Python Bridge
      process.stdout.write(`  ${C.grey}Querying RAG knowledge base...${C.reset} `);
      let ragQuery;
      try {
        ragQuery = await buildAIEnhancedQuery(finding, apiKey);
      } catch (e) {
        ragQuery = buildQueryFromFinding(finding);
      }

      let ragDocs = [];
      try {
        ragDocs = await retrieveFromRAG(ragQuery, { k: 5, threshold: 0.35 });
      } catch (e) {}
      console.log(`${C.green}✔ (${ragDocs.length} knowledge chunk(s) retrieved)${C.reset}`);

      const retrievedContext = formatRAGContext(ragDocs);

      // 6b. Call LLM with MISO AI patch prompt template
      process.stdout.write(`  ${C.grey}Generating AI patch...${C.reset} `);
      const ruleAnalysis = formatRuleAnalysis([finding]);

      let patchResponse;
      try {
        const prompt = buildPatchPrompt({
          originalCode: currentSource,
          vulnerability: ragQuery,
          ruleAnalysis,
          retrievedContext
        });

        const rawResponse = await callLLMForPatch(prompt, activeApiKey, provider);
        console.log(`${C.green}✔${C.reset}`);
        patchResponse = parsePatchResponse(rawResponse);
      } catch (err) {
        console.log(`${C.red}✕ Error: ${err.message}${C.reset}`);
        skippedPatches.push({ finding, reason: err.message });
        continue;
      }

      // 6c. Render suggested patch (VS Code-style terminal diff) — DO NOT auto-apply!
      if (patchResponse.status === 'CORRECTION_AVAILABLE') {
        renderSuggestionPanel({
          finding,
          patchResponse,
          originalCode: currentSource,
          index: processedCount,
          total: totalCount
        });

        // 6d. Prompt: "Do you want to incorporate these changes?"
        const fileName = path.basename(absFilePath);
        const menuChoice = await showPatchMenu(
          `Do you want to incorporate these changes into ${fileName}?`,
          [
            { label: `[Y] Yes, apply changes to ${fileName}`, value: 'apply' },
            { label: '[N] No, skip this suggestion',          value: 'skip'  },
            { label: '[V] View full corrected file',          value: 'view'  },
            { label: '[Q] Quit patching session',             value: 'quit'  },
          ]
        );

        if (menuChoice === 'quit') {
          console.log(`\n${C.yellow}Patching session ended by user.${C.reset}\n`);
          break;
        }

        if (menuChoice === 'view') {
          console.log(`\n${C.bold}── Full Corrected Content ──${C.reset}\n`);
          const lines = patchResponse.corrected_code.split('\n');
          lines.forEach((line, i) => console.log(`  ${C.grey}${String(i + 1).padStart(4)}${C.reset} │ ${line}`));
          console.log('');

          const applyAfterView = await confirmPrompt(`Incorporate these changes into ${fileName}?`, true);
          if (applyAfterView) {
            await doApplyPatch(absFilePath, patchResponse.corrected_code, finding, appliedPatches, skippedPatches);
            if (fs.existsSync(absFilePath)) currentSource = fs.readFileSync(absFilePath, 'utf8');
          } else {
            skippedPatches.push({ finding, reason: 'skipped_by_user' });
          }
        } else if (menuChoice === 'apply') {
          // Apply patch to actual contract file
          await doApplyPatch(absFilePath, patchResponse.corrected_code, finding, appliedPatches, skippedPatches);
          if (fs.existsSync(absFilePath)) currentSource = fs.readFileSync(absFilePath, 'utf8');
        } else {
          skippedPatches.push({ finding, reason: 'skipped_by_user' });
        }
      } else {
        renderStatusPanel({ finding, patchResponse, index: processedCount, total: totalCount });
        skippedPatches.push({ finding, reason: patchResponse.status });
      }
    }
  }

  // ── Step 7: Summary & Re-scan Prompt ─────────────────────────────
  console.log(`\n${C.bold}Patch Session Summary:${C.reset}`);
  console.log(`  ${C.green}✔ Changes Incorporated:${C.reset} ${appliedPatches.length} patch(es)`);
  console.log(`  ${C.grey}  Skipped:${C.reset}              ${skippedPatches.length} finding(s)\n`);

  if (appliedPatches.length > 0) {
    // 7a. Prompt user for re-scan
    const wantRescan = await confirmPrompt('Would you like to re-scan the contract to verify the changes?', true);

    if (wantRescan) {
      console.log(`\n${C.bold}Re-scanning modified contract(s)...${C.reset}\n`);
      const reScan = await scanFiles(targetFiles, { apiKey, staticOnly: false, forceFresh: true });
      displayResults(reScan);
      logToMarkdown(reScan);

      const scoreDelta = reScan.score - initialScan.score;
      if (scoreDelta > 0) {
        console.log(`${C.green}${C.bold}✔ Security Score Improved: ${initialScan.score}/100 → ${reScan.score}/100 (+${scoreDelta})${C.reset}\n`);
      } else if (scoreDelta < 0) {
        console.log(`${C.yellow}⚠ Security Score Changed: ${initialScan.score}/100 → ${reScan.score}/100 (${scoreDelta})${C.reset}\n`);
      } else {
        console.log(`${C.grey}Security Score: ${reScan.score}/100.${C.reset}\n`);
      }
    } else {
      console.log(`${C.grey}Re-scan skipped. You can re-scan anytime by running: miso scan${C.reset}\n`);
    }
  } else {
    console.log(`${C.grey}No changes were made to the contract.${C.reset}\n`);
  }
}

async function doApplyPatch(absFilePath, correctedCode, finding, appliedPatches, skippedPatches) {
  const C = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', grey: '\x1b[90m' };
  process.stdout.write(`  ${C.grey}Applying changes to ${path.basename(absFilePath)}...${C.reset} `);
  const { success, backupPath, error } = applyPatch(absFilePath, correctedCode);
  if (success) {
    console.log(`${C.green}✔ Patch applied!${C.reset}`);
    console.log(`  ${C.grey}Backup saved to: ${backupPath}${C.reset}\n`);
    appliedPatches.push({ finding, backupPath });
  } else {
    console.log(`${C.red}✕ Failed to apply patch: ${error}${C.reset}\n`);
    skippedPatches.push({ finding, reason: error });
  }
}
