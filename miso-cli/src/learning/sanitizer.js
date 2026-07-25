/**
 * Extracts anonymized, non-sensitive vulnerability features from a scan result
 * for contribution to the Miso Knowledge Database.
 */
export function extractLearningFeatures(scanResult) {
  if (!scanResult || !scanResult.findings || scanResult.findings.length === 0) return [];

  const records = [];
  for (const finding of scanResult.findings) {
    // Strip file paths, function names, and any identifiable data
    const sanitizedDetails = (finding.details || '')
      .replace(/File:\s*[^\s]+/gi, '[REDACTED_FILE]')
      .replace(/"[^"]{1,40}"/g, '"[REDACTED_IDENTIFIER]"')
      .replace(/0x[0-9a-fA-F]+/g, '[REDACTED_ADDR]')
      .replace(/[1-9A-HJ-NP-Za-km-z]{32,44}/g, '[REDACTED_PUBKEY]');

    const sanitizedFix = (finding.recommendation || '')
      .replace(/0x[0-9a-fA-F]+/g, '[REDACTED_ADDR]')
      .replace(/[1-9A-HJ-NP-Za-km-z]{32,44}/g, '[REDACTED_PUBKEY]');

    records.push({
      vulnerabilityId: `${finding.ruleId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      language: 'rust',
      compilerVersion: null,
      vulnerabilityType: finding.ruleId || 'UNKNOWN',
      severity: finding.severity || 'Medium',
      embedding: null,
      astPattern: sanitizedDetails,
      bytecodePattern: null,
      aiReasoning: sanitizedDetails,
      suggestedFix: sanitizedFix,
      confidence: finding.source === 'static' ? 70 : 85,
      frequency: 1,
      timestamp: new Date().toISOString()
    });
  }
  return records;
}
