import fs from 'fs';
import path from 'path';
import { loadLocalKnowledge } from './knowledge.js';
import { pool } from '../db.js';

function extractCodeTokens(text) {
  if (!text) return new Set();
  const normalized = text.replace(/\[REDACTED_[A-Z_]+\]/g, '').replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/_/g, ' ');
  const tokens = normalized.match(/[a-zA-Z0-9]+/g) || [];
  return new Set(tokens.map(t => t.toLowerCase()).filter(t => !t.startsWith('ast') && t.length > 2));
}

function calculateContainment(targetTokens, patternTokens) {
  if (patternTokens.size === 0 || targetTokens.size === 0) return 0;
  let matches = 0;
  for (const token of patternTokens) { if (targetTokens.has(token)) matches++; }
  return matches / patternTokens.size;
}

async function getAllKnowledgeRecords() {
  let records = [];
  try {
    const res = await pool.query(`SELECT * FROM vulnerability_knowledge`);
    if (res.rows?.length > 0) {
      records = res.rows.map(r => ({ vulnerabilityId: r.vulnerability_id, vulnerabilityType: r.vulnerability_type, severity: r.severity, astPattern: r.ast_pattern, bytecodePattern: r.bytecode_pattern, aiReasoning: r.ai_reasoning, suggestedFix: r.suggested_fix, confidence: r.confidence }));
    }
  } catch (e) {}
  if (records.length === 0) records = loadLocalKnowledge();
  return records;
}

export async function findMatchingVulnerabilityPatterns(filePaths, options = {}) {
  const records = await getAllKnowledgeRecords();
  if (records.length === 0) return { found: false };

  const fileSources = [];
  for (const fp of filePaths) {
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, 'utf8');
      const relPath = path.relative(process.cwd(), fp).replace(/\\/g, '/');
      fileSources.push({ path: relPath, content });
    }
  }
  if (fileSources.length === 0) return { found: false };

  const combinedCode = fileSources.map(f => f.content).join('\n');
  const targetTokens = extractCodeTokens(combinedCode);
  const matchedFindings = [];
  let highestSimilarity = 0;

  for (const record of records) {
    const patternText = `${record.vulnerabilityType} ${record.astPattern || ''}`;
    const patternTokens = extractCodeTokens(patternText);
    if (patternTokens.size < 3) continue;
    const containmentScore = calculateContainment(targetTokens, patternTokens);
    if (containmentScore > highestSimilarity) highestSimilarity = containmentScore;
    if (containmentScore >= 0.75) {
      const relFile = fileSources[0].path;
      const exists = matchedFindings.some(f => f.ruleId === record.vulnerabilityType && f.details === record.aiReasoning);
      if (!exists) {
        matchedFindings.push({
          ruleId: record.vulnerabilityType, severity: record.severity,
          deduction: record.severity === 'High' ? 25 : 15, line: 1,
          details: `[Database Match] ${record.aiReasoning}`, file: relFile,
          recommendation: record.suggestedFix || 'Review code logic based on database vulnerability pattern.',
          source: 'database_match'
        });
      }
    }
  }

  if (matchedFindings.length > 0) {
    let score = 100;
    for (const f of matchedFindings) score -= f.deduction;
    score = Math.max(0, score);
    return {
      found: true, score, confidenceScore: score, staticScore: score, aiScore: score, margin: 0,
      aiSummary: `Matched ${matchedFindings.length} vulnerability pattern(s) from Miso Knowledge Database (Pattern Match: ${(highestSimilarity * 100).toFixed(1)}%).`,
      findings: matchedFindings, filesScanned: fileSources.map(f => f.path)
    };
  }
  return { found: false };
}
