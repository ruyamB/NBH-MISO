/**
 * Parses and validates the LLM JSON response from the MISO AI patch prompt.
 */

const VALID_STATUSES = [
  'CORRECTION_AVAILABLE',
  'FALSE_POSITIVE',
  'INSUFFICIENT_CONTEXT',
  'MANUAL_REVIEW_REQUIRED'
];

function ensureString(val) {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(ensureString).join('\n');
  if (val && typeof val === 'object') return JSON.stringify(val, null, 2);
  if (val === null || val === undefined) return '';
  return String(val);
}

function ensureStringArray(val) {
  if (Array.isArray(val)) return val.map(ensureString);
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return [];
}

/**
 * Parses the raw LLM text response into a typed PatchResponse object.
 *
 * @param {string} rawResponse - Raw text from LLM
 * @returns {object}
 */
export function parsePatchResponse(rawResponse) {
  let cleaned = (rawResponse || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned.startsWith('{')) {
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return {
      status: 'MANUAL_REVIEW_REQUIRED',
      vulnerability_id: 'PARSE_ERROR',
      severity: 'Unknown',
      location: 'Unknown',
      explanation: 'MISO AI returned a response that could not be parsed as JSON. Manual review required.',
      suggested_patch: ensureString(rawResponse || '(no response)'),
      corrected_code: '',
      correction_explanation: '',
      assumptions: ['LLM response was not valid JSON'],
      verification_steps: ['Review the raw LLM output above', 'Re-run miso patch'],
      _parseError: true
    };
  }

  const status = VALID_STATUSES.includes(parsed.status) ? parsed.status : 'MANUAL_REVIEW_REQUIRED';

  return {
    status,
    vulnerability_id:      ensureString(parsed.vulnerability_id)      || 'UNKNOWN',
    severity:              ensureString(parsed.severity)              || 'Unknown',
    location:              ensureString(parsed.location)              || 'Unknown',
    explanation:           ensureString(parsed.explanation),
    suggested_patch:       ensureString(parsed.suggested_patch),
    corrected_code:        ensureString(parsed.corrected_code),
    correction_explanation:ensureString(parsed.correction_explanation),
    assumptions:           ensureStringArray(parsed.assumptions),
    verification_steps:    ensureStringArray(parsed.verification_steps).length > 0
                             ? ensureStringArray(parsed.verification_steps)
                             : ['Run cargo check', 'Run cargo test', 'Run MISO scan again'],
    _parseError:           false
  };
}
