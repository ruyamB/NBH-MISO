import fs from 'fs';
import path from 'path';

const COLORS = {
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m',
  cyan: '\x1b[36m', blue: '\x1b[34m', bold: '\x1b[1m', reset: '\x1b[0m'
};

export function getColoredScore(score) {
  let color = COLORS.red;
  if (score >= 90) color = COLORS.green;
  else if (score >= 50) color = COLORS.yellow;
  return `${color}${COLORS.bold}${score}/100${COLORS.reset}`;
}

export function getSeveritySymbol(severity) {
  switch (severity) {
    case 'Critical': return '🔴';
    case 'High':     return '🟠';
    case 'Medium':   return '🟡';
    default:         return '🔵';
  }
}

export function getPreviousScore() {
  const filePath = path.join(process.cwd(), 'MISO.md');
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [...content.matchAll(/\*\*Confidence Score:\*\*\s+(\d+)\/100/g)];
    if (matches.length > 0) return parseInt(matches[matches.length - 1][1], 10);
  } catch (e) {}
  return null;
}

export function displayResults(scanResult) {
  const { score, staticScore, aiScore, margin, findings, filesScanned } = scanResult;
  console.log(`\n${COLORS.bold}--- MISO Scan Summary ---${COLORS.reset}`);
  console.log(`Confidence Score: ${getColoredScore(score)}`);
  if (aiScore !== undefined && staticScore !== undefined) {
    const marginStr = margin !== undefined ? (margin >= 0 ? `+${margin}%` : `${margin}%`) : '±0%';
    console.log(`Score Breakdown:  75% AI (${aiScore}/100) + 25% Static (${staticScore}/100) [Margin: ${marginStr}]`);
  }
  console.log(`Files Scanned:    ${filesScanned.length}`);
  const prevScore = getPreviousScore();
  if (prevScore !== null) {
    const diff = score - prevScore;
    const diffText = diff > 0 ? `(↑ +${diff})` : diff < 0 ? `(↓ ${diff})` : `(no change)`;
    console.log(`Trend:            ${diffText} since last run`);
  }
  console.log('-------------------------\n');
  if (findings.length === 0) {
    console.log(`${COLORS.green}✔ No vulnerabilities detected! Ready for deployment.${COLORS.reset}\n`);
    return;
  }
  console.log(`${COLORS.bold}Findings:${COLORS.reset}`);
  const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Info': 4 };
  const sortedFindings = [...findings].sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));
  for (const finding of sortedFindings) {
    const sym = getSeveritySymbol(finding.severity);
    const srcTag = finding.source ? ` [${finding.source.toUpperCase()}]` : '';
    console.log(` ${sym} [${finding.severity}]${srcTag} ${finding.file}:${finding.line} - ${COLORS.bold}${finding.details}${COLORS.reset}`);
    console.log(`    Fix: ${finding.recommendation}\n`);
  }
}

export function logToMarkdown(scanResult, ruleSetVersion = 'v1.0') {
  const { score, staticScore, aiScore, margin, findings, filesScanned } = scanResult;
  const filePath = path.join(process.cwd(), 'MISO.md');
  const now = new Date();
  const utcString = now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
  const prevScore = getPreviousScore();
  let trendText = '';
  if (prevScore !== null) {
    const diff = score - prevScore;
    trendText = diff >= 0 ? ` (↑ +${diff} from previous run)` : ` (↓ ${diff} from previous run)`;
  }

  let mdContent = `## Run — ${utcString}\n`;
  mdContent += `**Confidence Score:** ${score}/100${trendText}\n`;
  if (aiScore !== undefined && staticScore !== undefined) {
    const marginStr = margin !== undefined ? (margin >= 0 ? `+${margin}%` : `${margin}%`) : '±0%';
    mdContent += `**Score Breakdown:** 75% AI (${aiScore}) + 25% Static (${staticScore}) [Margin: ${marginStr}]\n`;
  }
  mdContent += `**Rule Set Version:** ${ruleSetVersion}\n`;
  mdContent += `**Files Scanned:** ${filesScanned.join(', ')}\n\n`;
  mdContent += `### Findings\n`;
  if (findings.length === 0) {
    mdContent += `- ✔ No issues detected.\n`;
  } else {
    const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Info': 4 };
    const sortedFindings = [...findings].sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));
    for (const finding of sortedFindings) {
      const sym = getSeveritySymbol(finding.severity);
      const srcTag = finding.source ? ` [${finding.source.toUpperCase()}]` : '';
      mdContent += `- ${sym} **${finding.severity}**${srcTag} — ${finding.details} (${finding.file}:${finding.line})\n`;
    }
  }
  mdContent += `\n### Areas for Improvement\n`;
  const criticals = findings.filter(f => f.severity === 'Critical' || f.severity === 'High');
  const mediums = findings.filter(f => f.severity === 'Medium');
  if (criticals.length > 0) mdContent += `- Resolve critical/high-severity issues immediately: ${criticals.map(c => c.ruleId).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.\n`;
  if (mediums.length > 0) mdContent += `- Address arithmetic or configuration recommendations: ${mediums.map(m => m.ruleId).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.\n`;
  if (findings.length === 0) mdContent += `- Maintain current patterns and code safety standards.\n`;
  mdContent += `---\n\n`;
  fs.appendFileSync(filePath, mdContent, 'utf8');
}
