/**
 * MISO AI Diff Renderer
 * =====================
 * Renders a VS Code-style inline suggestion panel in the terminal.
 */

import { createPatch } from 'diff';

const C = {
  reset:      '\x1b[0m',
  bold:       '\x1b[1m',
  dim:        '\x1b[2m',
  red:        '\x1b[31m',
  green:      '\x1b[32m',
  yellow:     '\x1b[33m',
  cyan:       '\x1b[36m',
  blue:       '\x1b[34m',
  magenta:    '\x1b[35m',
  white:      '\x1b[37m',
  bgRed:      '\x1b[41m',
  bgGreen:    '\x1b[42m',
  grey:       '\x1b[90m',
};

const SEVERITY_COLORS = {
  Critical: C.red,
  High:     C.yellow,
  Medium:   C.cyan,
  Low:      C.blue,
  Info:     C.grey,
};

const SEVERITY_ICONS = {
  Critical: '🔴',
  High:     '🟠',
  Medium:   '🟡',
  Low:      '🔵',
  Info:     '⚪',
};

const STATUS_ICONS = {
  CORRECTION_AVAILABLE:   '✅',
  FALSE_POSITIVE:         '🟢',
  INSUFFICIENT_CONTEXT:   '⚠️ ',
  MANUAL_REVIEW_REQUIRED: '🔧',
};

const BOX_WIDTH = 70;

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function boxLine(content) {
  const inner = `  ${content}  `;
  const innerLen = stripAnsi(inner).length;
  const padding = Math.max(0, BOX_WIDTH - innerLen - 2);
  return `│${inner}${' '.repeat(padding)}│`;
}

function separator(label = '', char = '─') {
  if (!label) return C.grey + char.repeat(BOX_WIDTH) + C.reset;
  const labelFull = ` ${label} `;
  const remaining = Math.max(0, BOX_WIDTH - labelFull.length);
  const left = Math.floor(remaining / 2);
  const right = remaining - left;
  return C.grey + char.repeat(left) + C.reset + C.bold + labelFull + C.reset + C.grey + char.repeat(right) + C.reset;
}

function safeString(val) {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join('\n');
  if (val && typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val || '');
}

/**
 * Renders a full VS Code-style MISO AI suggestion panel.
 */
export function renderSuggestionPanel({ finding, patchResponse, originalCode, index, total }) {
  const sevColor = SEVERITY_COLORS[finding.severity] || C.white;
  const sevIcon  = SEVERITY_ICONS[finding.severity]  || '⚪';
  const statusIcon = STATUS_ICONS[patchResponse.status] || '❓';

  console.log('');
  console.log(C.grey + '╭' + '─'.repeat(BOX_WIDTH) + '╮' + C.reset);

  const titleContent = `${sevIcon} ${C.bold}${C.cyan}MISO AI${C.reset}  ·  ${sevColor}${C.bold}${finding.ruleId}${C.reset}  ·  ${sevColor}${finding.severity}${C.reset}  ${C.grey}[${index}/${total}]${C.reset}`;
  console.log(boxLine(titleContent));
  console.log(C.grey + '╰' + '─'.repeat(BOX_WIDTH) + '╯' + C.reset);

  console.log(`\n  ${C.grey}📍${C.reset}  ${C.bold}${finding.file}:${finding.line}${C.reset}`);

  const statusLabel = safeString(patchResponse.status).replace(/_/g, ' ');
  console.log(`  ${statusIcon}  Status: ${C.bold}${statusLabel}${C.reset}\n`);

  if (patchResponse.explanation) {
    console.log(separator('Explanation'));
    const wrapped = wordWrap(patchResponse.explanation, BOX_WIDTH - 4);
    wrapped.forEach(line => console.log(`  ${C.white}${line}${C.reset}`));
    console.log('');
  }

  if (patchResponse.status === 'CORRECTION_AVAILABLE' && patchResponse.corrected_code) {
    console.log(separator('Suggested Patch'));
    renderDiff(originalCode, patchResponse.corrected_code, finding.file, finding.line);
    console.log('');
  } else if (patchResponse.suggested_patch) {
    console.log(separator('Suggested Patch'));
    const patchLines = safeString(patchResponse.suggested_patch).split('\n');
    for (const line of patchLines) {
      if (line.startsWith('-')) {
        console.log(`  ${C.red}${line}${C.reset}`);
      } else if (line.startsWith('+')) {
        console.log(`  ${C.green}${line}${C.reset}`);
      } else {
        console.log(`  ${C.grey}${line}${C.reset}`);
      }
    }
    console.log('');
  }

  if (patchResponse.correction_explanation) {
    console.log(separator('Correction Explanation'));
    const wrapped = wordWrap(patchResponse.correction_explanation, BOX_WIDTH - 4);
    wrapped.forEach(line => console.log(`  ${C.white}${line}${C.reset}`));
    console.log('');
  }

  if (patchResponse.assumptions?.length > 0) {
    console.log(separator('Assumptions'));
    for (const a of patchResponse.assumptions) {
      console.log(`  ${C.grey}• ${safeString(a)}${C.reset}`);
    }
    console.log('');
  }

  if (patchResponse.verification_steps?.length > 0) {
    const steps = patchResponse.verification_steps.map(safeString).join('  ·  ');
    console.log(`  ${C.green}✔ Verification:${C.reset} ${C.grey}${steps}${C.reset}`);
    console.log('');
  }

  console.log(C.grey + '─'.repeat(BOX_WIDTH) + C.reset);
}

/**
 * Renders a colored unified diff between originalCode and correctedCode.
 */
function renderDiff(originalCode, correctedCode, filename, hintLine) {
  const origStr = safeString(originalCode);
  const corrStr = safeString(correctedCode);

  if (!origStr || !corrStr) {
    console.log(`  ${C.grey}(no diff available)${C.reset}`);
    return;
  }

  const patch = createPatch(filename, origStr, corrStr, '', '', { context: 5 });
  const lines = patch.split('\n');

  let lineNoOld = 0;
  let lineNoNew = 0;
  let inHeader = true;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
    if (hunkMatch) {
      lineNoOld = parseInt(hunkMatch[1]) - 1;
      lineNoNew = parseInt(hunkMatch[2]) - 1;
      inHeader = false;
      console.log(`  ${C.grey}  ·····  ${line}${C.reset}`);
      continue;
    }

    if (inHeader) continue;

    if (line.startsWith('-')) {
      lineNoOld++;
      const lineNum = String(lineNoOld).padStart(4, ' ');
      console.log(`  ${C.red}${lineNum} │ ${line.slice(1)}${C.reset}`);
    } else if (line.startsWith('+')) {
      lineNoNew++;
      const lineNum = String(lineNoNew).padStart(4, ' ');
      console.log(`  ${C.green}${lineNum} │ ${line.slice(1)}${C.reset}`);
    } else if (line !== '\\ No newline at end of file') {
      lineNoOld++;
      lineNoNew++;
      const lineNum = String(lineNoOld).padStart(4, ' ');
      console.log(`  ${C.grey}${lineNum} │ ${line.slice(1)}${C.reset}`);
    }
  }
}

export function renderStatusPanel({ finding, patchResponse, index, total }) {
  const sevColor = SEVERITY_COLORS[finding.severity] || C.white;
  const sevIcon  = SEVERITY_ICONS[finding.severity]  || '⚪';
  const statusIcon = STATUS_ICONS[patchResponse.status] || '❓';

  console.log('');
  console.log(C.grey + '╭' + '─'.repeat(BOX_WIDTH) + '╮' + C.reset);
  const titleContent = `${sevIcon} ${C.bold}${C.cyan}MISO AI${C.reset}  ·  ${sevColor}${C.bold}${finding.ruleId}${C.reset}  ·  ${sevColor}${finding.severity}${C.reset}  ${C.grey}[${index}/${total}]${C.reset}`;
  console.log(boxLine(titleContent));
  console.log(C.grey + '╰' + '─'.repeat(BOX_WIDTH) + '╯' + C.reset);
  console.log(`\n  ${statusIcon}  ${C.bold}${safeString(patchResponse.status).replace(/_/g, ' ')}${C.reset}`);
  if (patchResponse.explanation) {
    console.log('');
    const wrapped = wordWrap(patchResponse.explanation, BOX_WIDTH - 4);
    wrapped.forEach(line => console.log(`  ${C.white}${line}${C.reset}`));
  }
  console.log('');
  console.log(C.grey + '─'.repeat(BOX_WIDTH) + C.reset);
}

function wordWrap(text, maxWidth) {
  const str = safeString(text);
  const words = str.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
