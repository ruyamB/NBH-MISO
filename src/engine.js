import fs from 'fs';
import path from 'path';
import { parseSource } from './parser.js';
import { RULES } from './rules.js';

export function scanFiles(filePaths) {
  const allFindings = [];
  const filesScanned = [];

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
            recommendation: rule.recommendation
          });
        }
      }
    } catch (err) {
      console.error(`\x1b[31mError scanning file ${filePath}: ${err.message}\x1b[0m`);
    }
  }

  // Calculate score starting at 100
  let score = 100;
  for (const finding of allFindings) {
    score -= finding.deduction;
  }
  if (score < 0) score = 0;

  return {
    score,
    findings: allFindings,
    filesScanned
  };
}
