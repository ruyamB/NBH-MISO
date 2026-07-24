import crypto from 'crypto';

/**
 * Sanitizes text content by scrubbing sensitive information:
 * - API Keys
 * - Wallet Addresses (Solana Base58, Ethereum 0x...)
 * - File / project paths & developer usernames
 * - Code comments & inline secrets
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Remove API Keys
  sanitized = sanitized.replace(/gsk_[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
  sanitized = sanitized.replace(/AIzaSy[a-zA-Z0-9_-]{30,}/g, '[REDACTED_API_KEY]');
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');

  // 2. Remove Wallet Addresses (Solana Base58 ~32-44 chars, Ethereum 0x...)
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{40}/g, '[REDACTED_WALLET_ADDRESS]');
  sanitized = sanitized.replace(/[1-9A-HJ-NP-Za-km-z]{32,44}/g, (match) => {
    // Only redact if it looks like a Base58 address (not plain English words)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(match) && /[0-9]/.test(match)) {
      return '[REDACTED_WALLET_ADDRESS]';
    }
    return match;
  });

  // 3. Remove absolute directory paths / project names
  sanitized = sanitized.replace(/([A-Z]:\\[^\s:]+|(?:\/[^\s:]+)+)/gi, (match) => {
    const filename = match.split(/[/\\]/).pop();
    return filename || '[REDACTED_PATH]';
  });

  // 4. Remove single line & multi-line code comments if raw code present
  sanitized = sanitized.replace(/\/\/.*/g, '');
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');

  return sanitized.trim();
}

/**
 * Generates pseudo vector embedding (32-dim normalized array) for semantic search ranking
 */
export function generateEmbedding(text) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector = [];
  for (let i = 0; i < 32; i++) {
    const val = hash[i % hash.length];
    vector.push(parseFloat((val / 255.0).toFixed(4)));
  }
  return JSON.stringify(vector);
}

/**
 * Extracts anonymized knowledge records from scan result findings.
 */
export function extractLearningFeatures(scanResult, options = {}) {
  const findings = scanResult.findings || [];
  const records = [];

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const ruleId = f.ruleId || 'VULN';
    const severity = f.severity || 'Medium';
    const rawDetails = f.details || '';
    const rawRecommendation = f.recommendation || '';

    const sanitizedReasoning = sanitizeText(rawDetails);
    const sanitizedFix = sanitizeText(rawRecommendation);
    const astPattern = sanitizeText(`AST_NODE_${ruleId}_LINE_${f.line || 1}`);
    const bytecodePattern = crypto.createHash('md5').update(`${ruleId}:${sanitizedReasoning}`).digest('hex');

    const vulnerabilityId = `VULN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const embedding = generateEmbedding(`${ruleId} ${severity} ${sanitizedReasoning}`);

    records.push({
      vulnerabilityId,
      language: options.language || 'rust',
      compilerVersion: options.compilerVersion || 'anchor-cargo-1.75.0',
      vulnerabilityType: ruleId,
      severity,
      embedding,
      astPattern,
      bytecodePattern,
      aiReasoning: sanitizedReasoning,
      suggestedFix: sanitizedFix,
      confidence: scanResult.confidenceScore || scanResult.score || 90,
      frequency: 1,
      timestamp: new Date().toISOString()
    });
  }

  return records;
}
