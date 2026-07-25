import fs from 'fs';
import path from 'path';
import { pool } from '../db.js';

function getLocalKnowledgePath() {
  const dir = path.join(process.cwd(), '.miso');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'knowledge_db.json');
}

export function loadLocalKnowledge() {
  const filePath = getLocalKnowledgePath();
  if (!fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) || []; } catch { return []; }
}

export function saveLocalKnowledge(records) {
  const filePath = getLocalKnowledgePath();
  const existing = loadLocalKnowledge();
  fs.writeFileSync(filePath, JSON.stringify([...existing, ...records], null, 2), 'utf8');
}

export async function saveKnowledgeRecords(records) {
  if (!records || records.length === 0) return;
  saveLocalKnowledge(records);
  try {
    for (const rec of records) {
      await pool.query(
        `INSERT INTO vulnerability_knowledge (id,vulnerability_id,language,compiler_version,vulnerability_type,severity,embedding,ast_pattern,bytecode_pattern,ai_reasoning,suggested_fix,confidence,frequency,timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO UPDATE SET frequency = vulnerability_knowledge.frequency + 1`,
        [rec.vulnerabilityId, rec.vulnerabilityId, rec.language, rec.compilerVersion, rec.vulnerabilityType, rec.severity, rec.embedding, rec.astPattern, rec.bytecodePattern, rec.aiReasoning, rec.suggestedFix, rec.confidence, rec.frequency, rec.timestamp]
      );
    }
  } catch (err) {}
}

export async function getRelevantKnowledge(vulnerabilityTypes = [], topK = 3) {
  let records = [];
  try {
    const res = await pool.query(`SELECT * FROM vulnerability_knowledge ORDER BY frequency DESC, confidence DESC LIMIT $1`, [topK]);
    if (res.rows?.length > 0) {
      records = res.rows.map(r => ({ vulnerabilityId: r.vulnerability_id, vulnerabilityType: r.vulnerability_type, severity: r.severity, astPattern: r.ast_pattern, aiReasoning: r.ai_reasoning, suggestedFix: r.suggested_fix, confidence: r.confidence }));
    }
  } catch (e) {}
  if (records.length === 0) {
    const local = loadLocalKnowledge();
    records = local.slice(0, topK).map(r => ({ vulnerabilityId: r.vulnerabilityId, vulnerabilityType: r.vulnerabilityType, severity: r.severity, astPattern: r.astPattern, aiReasoning: r.aiReasoning, suggestedFix: r.suggestedFix, confidence: r.confidence }));
  }
  return records;
}
