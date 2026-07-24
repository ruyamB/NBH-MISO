import fs from 'fs';
import path from 'path';
import { loadPromptContext } from './prompts.js';

/**
 * Discovers available Gemini models for the user's API key.
 */
async function discoverGeminiModel(apiKey) {
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
      if (preferred && preferred.name) {
        return preferred.name.replace(/^models\//, '');
      }
    }
  } catch (e) {
    // Ignore fetch error, fall back to default candidates
  }
  return null;
}

/**
 * Runs Groq AI security analysis using LLaMA models on Groq's high-speed inference engine.
 */
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: promptContext.systemPrompt
            },
            {
              role: 'user',
              content: `${promptContext.instructions}\n\n=== RULES ===\n${promptContext.rules}${knowledgeContext}\n\n=== CONTRACT SOURCE CODE TO ANALYZE ===\n${contractSource}\n\nReturn ONLY a JSON object with "aiScore" (0-100), "summary", and "findings" array.`
            }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue; // Try next Groq model candidate
        }
        if (response.status === 401 || response.status === 403) {
          console.warn('\n\x1b[31m✕ Groq API Error: Invalid User Groq API Key provided.\x1b[0m');
          console.warn('\x1b[33mUpdate your key using: npx miso provider-gsk_...\x1b[0m\n');
          break;
        }
        if (response.status === 429) {
          console.warn('\n\x1b[33m⚠ Groq API Rate Limit reached (429).\x1b[0m');
          console.warn('\x1b[33mSystem is proceeding with static analysis...\x1b[0m\n');
          break;
        }
        lastErrText = await response.text();
        console.warn(`\n\x1b[31m✕ Groq API Error (${response.status}): ${lastErrText}\x1b[0m\n`);
        break;
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || '{}';

      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanedText);

      const aiScore = typeof result.aiScore === 'number' ? Math.max(0, Math.min(100, Math.round(result.aiScore))) : 90;
      const findings = Array.isArray(result.findings) ? result.findings : [];
      const summary = result.summary || 'Groq AI scan completed successfully.';
      const tokensUsed = data.usage?.total_tokens || Math.ceil(((promptContext.systemPrompt + promptContext.instructions + promptContext.rules + contractSource).length + responseText.length) / 4);

      return {
        aiScore,
        summary,
        findings,
        tokensUsed
      };
    } catch (err) {
      lastErrText = err.message;
    }
  }

  const staticScore = options.staticResult ? options.staticResult.score : 80;
  return {
    failed: true,
    aiScore: staticScore,
    summary: `Groq AI scan skipped due to API error. ${lastErrText}`,
    findings: []
  };
}

/**
 * Runs Gemini AI security analysis on target Rust contract files.
 */
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

  const userPrompt = `${promptContext.combinedMemory}${knowledgeContext}

=== CONTRACT SOURCE CODE TO ANALYZE ===
${contractSource}

Return JSON with "aiScore" (0-100), "summary", and "findings" array.`;

  const discoveredModel = await discoverGeminiModel(apiKey);
  const candidates = discoveredModel 
    ? [discoveredModel, 'gemini-1.5-flash', 'gemini-1.5-flash-002', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-exp']
    : ['gemini-1.5-flash', 'gemini-1.5-flash-002', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-exp'];
  const models = [...new Set(candidates)];

  let lastErrText = '';

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }

        if (response.status === 429) {
          console.warn('\n\x1b[33m⚠ Gemini API Free Tier Rate Limit reached (429).\x1b[0m');
          console.warn('\x1b[33mSystem is proceeding with static analysis to avoid blocking...\x1b[0m\n');
          const staticScore = options.staticResult ? options.staticResult.score : 80;
          return {
            failed: true,
            aiScore: staticScore,
            summary: 'AI scan skipped due to Gemini API rate limit (429).',
            findings: []
          };
        }

        if (response.status === 400 || response.status === 401 || response.status === 403) {
          console.warn('\n\x1b[31m✕ Gemini API Error: Invalid User Gemini API Key provided.\x1b[0m');
          console.warn('\x1b[33mUpdate your key using: npx miso provider-<YOUR_REAL_KEY>\x1b[0m\n');
          const staticScore = options.staticResult ? options.staticResult.score : 80;
          return {
            failed: true,
            aiScore: staticScore,
            summary: 'AI scan skipped due to invalid API key.',
            findings: []
          };
        }

        lastErrText = await response.text();
        console.warn(`\n\x1b[31m✕ Gemini API Error (${response.status}): ${lastErrText}\x1b[0m\n`);
        break;
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanedText);

      const aiScore = typeof result.aiScore === 'number' ? Math.max(0, Math.min(100, Math.round(result.aiScore))) : 90;
      const findings = Array.isArray(result.findings) ? result.findings : [];
      const summary = result.summary || 'Gemini AI scan completed successfully.';
      const tokensUsed = data.usageMetadata?.totalTokenCount || Math.ceil((userPrompt.length + responseText.length) / 4);

      return {
        aiScore,
        summary,
        findings,
        tokensUsed
      };
    } catch (err) {
      lastErrText = err.message;
    }
  }

  console.warn(`\n\x1b[33m⚠ AI scan error: ${lastErrText || 'Model not found for this API key'}. System is proceeding with static analysis...\x1b[0m\n`);
  const fallbackScore = options.staticResult ? options.staticResult.score : 80;
  return {
    failed: true,
    aiScore: fallbackScore,
    summary: `AI scan skipped due to API error. ${lastErrText}`,
    findings: []
  };
}

/**
 * Core entry point for AI security scanning. Automatically routes to Groq or Gemini.
 */
export async function runAIScan(filePaths, options = {}) {
  // Handle test mode or missing API key gracefully
  if (process.env.MISO_TEST === 'true' || options.mock === true) {
    return runMockAIScan(filePaths, options.staticResult);
  }

  const groqKey = options.apiKey?.startsWith('gsk_') ? options.apiKey : (process.env.GROQ_API_KEY || process.env.MISO_GROQ_API_KEY || '');
  const geminiKey = options.apiKey?.startsWith('AIza') ? options.apiKey : (process.env.GEMINI_API_KEY || process.env.MISO_GEMINI_API_KEY || '');
  const rawKey = options.apiKey || groqKey || geminiKey;

  if (!rawKey) {
    console.warn('\x1b[33mWarning: User API Key not set. System is proceeding with static analysis...\x1b[0m');
    console.warn('\x1b[33mSet your key with: npx miso provider-gsk_... or npx miso provider-AIza...\x1b[0m\n');
    const staticScore = options.staticResult ? options.staticResult.score : 100;
    return {
      failed: true,
      aiScore: staticScore,
      summary: 'AI scan skipped due to missing API key.',
      findings: []
    };
  }

  if (rawKey.startsWith('gsk_') || options.provider === 'groq') {
    return runGroqAIScan(filePaths, options, rawKey);
  }

  if (rawKey.startsWith('AIza') || options.provider === 'gemini') {
    return runGeminiAIScan(filePaths, options, rawKey);
  }

  // Fall back to attempting Groq or Gemini based on string patterns or defaults
  if (rawKey.includes('gsk')) {
    return runGroqAIScan(filePaths, options, rawKey);
  } else {
    return runGeminiAIScan(filePaths, options, rawKey);
  }
}

/**
 * Mock AI scan execution for automated testing
 */
function runMockAIScan(filePaths, staticResult) {
  const staticScore = staticResult ? staticResult.score : 100;
  
  let aiScore = staticScore;
  const findings = [];

  if (staticResult && staticResult.findings && staticResult.findings.length > 0) {
    for (const f of staticResult.findings) {
      findings.push({
        severity: f.severity,
        file: f.file,
        line: f.line,
        details: `[AI Verified] ${f.details}`,
        recommendation: f.recommendation
      });
    }
  }

  return {
    aiScore,
    summary: 'Mock AI security scan completed.',
    findings,
    tokensUsed: 0
  };
}
