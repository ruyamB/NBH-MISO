import fs from 'fs';
import path from 'path';
import { pool } from '../db.js';

function getLocalKnowledgePath() {
  const dir = path.join(process.cwd(), '.miso');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'knowledge_db.json');
}

export function loadLocalKnowledge() {
  const filePath = getLocalKnowledgePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) || [];
  } catch (err) {
    return [];
  }
}

export function saveLocalKnowledge(records) {
  const filePath = getLocalKnowledgePath();
  const existing = loadLocalKnowledge();
  const updated = [...existing, ...records];
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
}

/**
 * Saves anonymized vulnerability records to DB and local cache.
 */
export async function saveKnowledgeRecords(records) {
  if (!records || records.length === 0) return;

  // 1. Always save to local cache file
  saveLocalKnowledge(records);

  // 2. Save to Postgres DB if available
  try {
    for (const rec of records) {
      await pool.query(
        `INSERT INTO vulnerability_knowledge (
          id, vulnerability_id, language, compiler_version, vulnerability_type,
          severity, embedding, ast_pattern, bytecode_pattern, ai_reasoning,
          suggested_fix, confidence, frequency, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET frequency = vulnerability_knowledge.frequency + 1`,
        [
          rec.vulnerabilityId,
          rec.vulnerabilityId,
          rec.language,
          rec.compilerVersion,
          rec.vulnerabilityType,
          rec.severity,
          rec.embedding,
          rec.astPattern,
          rec.bytecodePattern,
          rec.aiReasoning,
          rec.suggestedFix,
          rec.confidence,
          rec.frequency,
          rec.timestamp
        ]
      );
    }
  } catch (err) {
    // If DB connection fails, local cache remains populated
  }
}

/**
 * Retrieves Top-K relevant vulnerability patterns for live AI scanning.
 */
export async function getRelevantKnowledge(vulnerabilityTypes = [], topK = 3) {
  let records = [];

  // Try DB search first
  try {
    const res = await pool.query(
      `SELECT * FROM vulnerability_knowledge ORDER BY frequency DESC, confidence DESC LIMIT $1`,
      [topK]
    );
    if (res.rows && res.rows.length > 0) {
      records = res.rows.map(row => ({
        vulnerabilityId: row.vulnerability_id,
        vulnerabilityType: row.vulnerability_type,
        severity: row.severity,
        astPattern: row.ast_pattern,
        aiReasoning: row.ai_reasoning,
        suggestedFix: row.suggested_fix,
        confidence: row.confidence
      }));
    }
  } catch (e) {
    // Fall back to local json file if DB query fails
  }

  if (records.length === 0) {
    const local = loadLocalKnowledge();
    records = local.slice(0, topK).map(row => ({
      vulnerabilityId: row.vulnerabilityId,
      vulnerabilityType: row.vulnerabilityType,
      severity: row.severity,
      astPattern: row.astPattern,
      aiReasoning: row.aiReasoning,
      suggestedFix: row.suggestedFix,
      confidence: row.confidence
    }));
  }

  return records;
}
