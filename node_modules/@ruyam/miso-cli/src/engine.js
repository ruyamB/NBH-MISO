import fs from 'fs';
import path from 'path';
import { parseSource } from './parser.js';
import { RULES } from './rules.js';
import { runAIScan } from './ai/scanner.js';

export async function scanFiles(filePaths, options = {}) {
  const allFindings = [];
  const filesScanned = [];

  // 1. Static Parsing Engine
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const lines = source.split('\n');
      const parsed = parseSource(source);
      
      const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      filesScanned.push(relativePath);

      for (const rule of RULES) {
        const ruleFindings = rule.check(parsed, lines);
        for (const finding of ruleFindings) {
          allFindings.push({
            ruleId: rule.id,
            severity: rule.severity,
            deduction: rule.deduction,
            line: finding.line,
            details: finding.details,
            file: relativePath,
            recommendation: rule.recommendation,
            source: 'static'
          });
        }
      }
    } catch (err) {
      console.error(`\x1b[31mError scanning file ${filePath}: ${err.message}\x1b[0m`);
    }
  }

  // Calculate static score starting at 100
  let staticScore = 100;
  for (const finding of allFindings) {
    staticScore -= finding.deduction;
  }
  if (staticScore < 0) staticScore = 0;

  const staticResult = {
    score: staticScore,
    findings: allFindings,
    filesScanned
  };

  // 2. AI Scanning Engine
  let aiScore = staticScore;
  let aiResult = { aiScore: staticScore, summary: 'Static analysis scan only.', findings: [] };
  let margin = 0;
  let confidenceScore = staticScore;

  if (!options.staticOnly) {
    aiResult = await runAIScan(filePaths, { staticResult, apiKey: options.apiKey });
    aiScore = aiResult.aiScore;

    if (aiResult.failed) {
      margin = 0;
      confidenceScore = staticScore;
    } else {
      // 3. Margin of Error: +- 2-3%
      if (process.env.MISO_TEST !== 'true') {
        const rawMargin = (Math.random() * 5) - 2.5;
        margin = Math.round(rawMargin * 10) / 10;
      }

      // 4. Final Confidence Score = 75% of AI score + 25% of static parsing +- margin
      const weightedScore = (0.75 * aiScore) + (0.25 * staticScore);
      confidenceScore = Math.max(0, Math.min(100, Math.round(weightedScore + margin)));
    }
  }

  // Combine static and AI findings
  const combinedFindings = [...allFindings];
  if (Array.isArray(aiResult.findings)) {
    for (const aiFinding of aiResult.findings) {
      // Avoid exact duplicate line/file entries if already covered by static analysis
      const exists = combinedFindings.some(f => f.file === aiFinding.file && f.line === aiFinding.line && f.details === aiFinding.details);
      if (!exists) {
        combinedFindings.push({
          ruleId: aiFinding.ruleId || 'AI_FINDING',
          severity: aiFinding.severity || 'Medium',
          deduction: 0,
          line: aiFinding.line || 1,
          details: aiFinding.details,
          file: aiFinding.file || (filesScanned[0] || 'contract.rs'),
          recommendation: aiFinding.recommendation || 'Review code logic.',
          source: 'ai'
        });
      }
    }
  }

  return {
    score: confidenceScore,
    confidenceScore,
    staticScore,
    aiScore,
    margin,
    aiSummary: aiResult.summary,
    findings: combinedFindings,
    filesScanned
  };
}
