import fs from 'fs';
import path from 'path';
import { loadPromptContext } from './prompts.js';

export async function discoverGeminiModel(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = data.models || [];
      const preferred = models.find(m =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        m.name.includes('flash')
      ) || models.find(m =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      );
      if (preferred?.name) return preferred.name.replace(/^models\//, '');
    }
  } catch (e) {}
  return null;
}

async function runGroqAIScan(filePaths, options, apiKey) {
  const promptContext = loadPromptContext();
  const codeBlocks = [];
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      codeBlocks.push(`=== File: ${relPath} ===\n${code}`);
    }
  }
  const contractSource = codeBlocks.join('\n\n');
  let knowledgeContext = '';
  if (Array.isArray(options.relevantKnowledge) && options.relevantKnowledge.length > 0) {
    knowledgeContext = `\n\n=== RETRIEVED MISO KNOWLEDGE BASE PATTERNS ===\n${JSON.stringify(options.relevantKnowledge, null, 2)}\n`;
  }

  const models = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];
  let lastErrText = '';
  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: promptContext.systemPrompt },
            { role: 'user', content: `${promptContext.instructions}\n\n=== RULES ===\n${promptContext.rules}${knowledgeContext}\n\n=== CONTRACT SOURCE CODE TO ANALYZE ===\n${contractSource}\n\nReturn ONLY a JSON object with "aiScore" (0-100), "summary", and "findings" array.` }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });
      if (!response.ok) {
        if (response.status === 404) continue;
        if (response.status === 401 || response.status === 403) { console.warn('\n\x1b[31m✕ Groq API Error: Invalid API Key.\x1b[0m'); break; }
        if (response.status === 429) { console.warn('\n\x1b[33m⚠ Groq Rate Limit. Proceeding with static analysis...\x1b[0m'); break; }
        lastErrText = await response.text();
        break;
      }
      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || '{}';
      const result = JSON.parse(responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      return {
        aiScore: typeof result.aiScore === 'number' ? Math.max(0, Math.min(100, Math.round(result.aiScore))) : 90,
        summary: result.summary || 'Groq AI scan completed.',
        findings: Array.isArray(result.findings) ? result.findings : [],
        tokensUsed: data.usage?.total_tokens || 0
      };
    } catch (err) { lastErrText = err.message; }
  }
  return { failed: true, aiScore: options.staticResult?.score || 80, summary: `Groq AI scan skipped. ${lastErrText}`, findings: [] };
}

async function runGeminiAIScan(filePaths, options, apiKey) {
  const promptContext = loadPromptContext();
  const codeBlocks = [];
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      codeBlocks.push(`=== File: ${relPath} ===\n${code}`);
    }
  }
  const contractSource = codeBlocks.join('\n\n');
  let knowledgeContext = '';
  if (Array.isArray(options.relevantKnowledge) && options.relevantKnowledge.length > 0) {
    knowledgeContext = `\n\n=== RETRIEVED MISO KNOWLEDGE BASE PATTERNS ===\n${JSON.stringify(options.relevantKnowledge, null, 2)}\n`;
  }
  const userPrompt = `${promptContext.combinedMemory}${knowledgeContext}\n\n=== CONTRACT SOURCE CODE TO ANALYZE ===\n${contractSource}\n\nReturn JSON with "aiScore" (0-100), "summary", and "findings" array.`;

  const discoveredModel = await discoverGeminiModel(apiKey);
  const candidates = discoveredModel
    ? [discoveredModel, 'gemini-1.5-flash', 'gemini-1.5-flash-002', 'gemini-2.0-flash-exp']
    : ['gemini-1.5-flash', 'gemini-1.5-flash-002', 'gemini-2.0-flash-exp'];
  const models = [...new Set(candidates)];
  let lastErrText = '';

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        })
      });
      if (!response.ok) {
        if (response.status === 404) continue;
        if (response.status === 429) { return { failed: true, aiScore: options.staticResult?.score || 80, summary: 'AI scan skipped: rate limit.', findings: [] }; }
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          console.warn('\n\x1b[31m✕ Gemini API Error: Invalid API Key.\x1b[0m');
          return { failed: true, aiScore: options.staticResult?.score || 80, summary: 'AI scan skipped: invalid key.', findings: [] };
        }
        lastErrText = await response.text();
        break;
      }
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const result = JSON.parse(responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      return {
        aiScore: typeof result.aiScore === 'number' ? Math.max(0, Math.min(100, Math.round(result.aiScore))) : 90,
        summary: result.summary || 'Gemini AI scan completed.',
        findings: Array.isArray(result.findings) ? result.findings : [],
        tokensUsed: data.usageMetadata?.totalTokenCount || 0
      };
    } catch (err) { lastErrText = err.message; }
  }
  console.warn(`\n\x1b[33m⚠ AI scan error: ${lastErrText || 'Unknown'}. Proceeding with static analysis...\x1b[0m\n`);
  return { failed: true, aiScore: options.staticResult?.score || 80, summary: `AI scan skipped. ${lastErrText}`, findings: [] };
}

export async function runAIScan(filePaths, options = {}) {
  if (process.env.MISO_TEST === 'true' || options.mock === true) return runMockAIScan(filePaths, options.staticResult);

  const groqKey = options.apiKey?.startsWith('gsk_') ? options.apiKey : (process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY || '');
  const geminiKey = options.apiKey?.startsWith('AIza') ? options.apiKey : (process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY || '');
  const rawKey = options.apiKey || groqKey || geminiKey;

  if (!rawKey) {
    console.warn('\x1b[33mWarning: API Key not set. Proceeding with static analysis...\x1b[0m\n');
    return { failed: true, aiScore: options.staticResult?.score || 100, summary: 'AI scan skipped: missing API key.', findings: [] };
  }
  if (rawKey.startsWith('gsk_') || options.provider === 'groq') return runGroqAIScan(filePaths, options, rawKey);
  return runGeminiAIScan(filePaths, options, rawKey);
}

function runMockAIScan(filePaths, staticResult) {
  const staticScore = staticResult?.score || 100;
  const findings = (staticResult?.findings || []).map(f => ({
    severity: f.severity,
    file: f.file,
    line: f.line,
    details: `[AI Verified] ${f.details}`,
    recommendation: f.recommendation
  }));
  return { aiScore: staticScore, summary: 'Mock AI security scan completed.', findings, tokensUsed: 0 };
}
