/**
 * Converts structured MISO scan findings into a natural language query
 * optimized for ChromaDB similarity retrieval.
 *
 * Instead of passing raw JSON finding objects to the RAG, we ask the LLM
 * to generate a rich, semantically meaningful question that will surface
 * the most relevant security knowledge chunks.
 */

/**
 * Builds a natural language RAG query from one finding (rule-based, no LLM call).
 * This is the fast/offline version used when no API key is available.
 *
 * @param {object} finding - A single finding from engine.js
 * @returns {string}
 */
export function buildQueryFromFinding(finding) {
  const { ruleId, severity, details, recommendation, file } = finding;

  const ruleDescriptions = {
    MISSING_SIGNER_CHECK:   'missing explicit signer verification, authority not validated',
    UNCHECKED_ARITHMETIC:   'unsafe raw arithmetic that may cause integer overflow or underflow',
    PDA_BUMP_UNVALIDATED:   'PDA bump seed not validated, seed collision vulnerability',
    MISSING_OWNERSHIP_CHECK:'missing program-owner validation for accounts, no owner check',
    UNSAFE_ACCOUNT_CLOSE:   'unsafe account closure without clearing data or reassigning owner',
    MISSING_RENT_EXEMPTION: 'missing rent exemption check on account initialization',
    UNCONSTRAINED_CPI:      'unconstrained cross-program invocation without target program validation',
  };

  const ruleDesc = ruleDescriptions[ruleId] || ruleId;
  const fnMatch = details.match(/(?:Function|Struct) "([^"]+)"/);
  const contextName = fnMatch ? fnMatch[1] : 'instruction handler';

  return [
    `How can I fix the following Solana Anchor security findings in \`${contextName}\`:`,
    ruleDesc + '?',
    `Please provide secure Anchor constraints and code-level fixes.`,
    `Vulnerability: ${ruleId} | Severity: ${severity}`,
  ].join(' ');
}

/**
 * Builds a natural language RAG query from multiple findings (for a group of
 * findings that affect the same file or function).
 *
 * @param {Array} findings - Array of findings from engine.js
 * @returns {string}
 */
export function buildQueryFromFindings(findings) {
  if (!findings || findings.length === 0) return '';
  if (findings.length === 1) return buildQueryFromFinding(findings[0]);

  const ruleIds = [...new Set(findings.map(f => f.ruleId))];
  const severities = [...new Set(findings.map(f => f.severity))];
  const fnNames = [...new Set(
    findings.map(f => {
      const m = f.details.match(/(?:Function|Struct) "([^"]+)"/);
      return m ? m[1] : null;
    }).filter(Boolean)
  )];

  const ruleDescriptions = {
    MISSING_SIGNER_CHECK:   'missing explicit signer verification',
    UNCHECKED_ARITHMETIC:   'unsafe arithmetic causing overflow/underflow',
    PDA_BUMP_UNVALIDATED:   'PDA bump seed not validated',
    MISSING_OWNERSHIP_CHECK:'missing program-owner validation',
    UNSAFE_ACCOUNT_CLOSE:   'unsafe account closure',
    MISSING_RENT_EXEMPTION: 'missing rent exemption check',
    UNCONSTRAINED_CPI:      'unconstrained cross-program invocation',
  };

  const issueList = ruleIds.map(id => ruleDescriptions[id] || id).join(', ');
  const functionContext = fnNames.length > 0 ? ` in \`${fnNames.join(', ')}\`` : '';

  return [
    `How can I fix these Solana Anchor security findings${functionContext}:`,
    issueList + '?',
    `Please provide secure Anchor constraints, checked arithmetic such as checked_add/checked_sub,`,
    `appropriate owner checks, and Signer validation.`,
    `Vulnerabilities: ${ruleIds.join(', ')} | Severity: ${severities.join(', ')}`,
  ].join(' ');
}

/**
 * Uses the LLM to generate a richer query from finding details.
 * Falls back to buildQueryFromFinding() if LLM call fails.
 *
 * @param {object} finding  - A single finding
 * @param {string} apiKey   - Gemini or Groq API key
 * @returns {Promise<string>}
 */
export async function buildAIEnhancedQuery(finding, apiKey) {
  if (!apiKey) return buildQueryFromFinding(finding);

  const prompt = `You are a Solana smart-contract security expert.
Convert the following structured vulnerability finding into a single natural language question
optimized for searching a security knowledge base. The question should be specific, technical,
and mention the vulnerability type, affected construct, and what fix is needed.
Return ONLY the question string, no JSON, no explanation.

Vulnerability Finding:
- Rule ID: ${finding.ruleId}
- Severity: ${finding.severity}
- Details: ${finding.details}
- Recommendation: ${finding.recommendation}
- File: ${finding.file}`;

  try {
    let response;
    if (apiKey.startsWith('gsk_')) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200
        })
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 20) return text;
      }
    } else {
      // Try Gemini
      const discoveredModel = 'gemini-1.5-flash';
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${discoveredModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 20) return text;
      }
    }
  } catch (e) {}

  // Fallback
  return buildQueryFromFinding(finding);
}
