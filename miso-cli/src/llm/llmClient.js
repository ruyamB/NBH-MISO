/**
 * LLM Client for MISO AI Patch Generation.
 * Routes to Gemini or Groq based on API key prefix or specified provider.
 * Uses the full MISO AI patch prompt (not the scan prompt).
 */

import { discoverGeminiModel } from '../ai/scanner.js';

/**
 * Sends the filled MISO AI patch prompt to the LLM and returns the raw JSON response text.
 *
 * @param {string} prompt    - Fully assembled patch prompt from promptTemplate.js
 * @param {string} apiKey    - Gemini or Groq API key
 * @param {string} [provider]- Optional provider name ('gemini' | 'groq')
 * @returns {Promise<string>} - Raw LLM response text
 */
export async function callLLMForPatch(prompt, apiKey, provider) {
  if (!apiKey) {
    throw new Error('No API key provided for MISO AI patch generation.');
  }

  const normalizedProvider = String(provider || '').toLowerCase();
  if (normalizedProvider === 'groq' || apiKey.startsWith('gsk_')) {
    return callGroqForPatch(prompt, apiKey);
  }

  // Default to Gemini for AIza... keys or unspecified provider
  return callGeminiForPatch(prompt, apiKey);
}

async function callGroqForPatch(prompt, apiKey) {
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
              content: 'You are MISO AI, a specialized Solana smart-contract security assistant. Always respond with valid JSON only, no markdown.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        if (response.status === 404) continue;
        lastErrText = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Groq API Error (${response.status}): Invalid API key.`);
        }
        break;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '{}';
    } catch (err) {
      lastErrText = err.message;
    }
  }
  throw new Error(`Groq patch generation failed: ${lastErrText || 'Unknown error'}`);
}

async function callGeminiForPatch(prompt, apiKey) {
  const discovered = await discoverGeminiModel(apiKey);
  const candidateModels = [
    discovered,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-002',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro'
  ].filter(Boolean);

  const models = [...new Set(candidateModels)];
  let lastErrText = '';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              maxOutputTokens: 4096
            }
          })
        }
      );

      if (!response.ok) {
        if (response.status === 404) continue;
        lastErrText = await response.text();
        if (response.status === 429) {
          throw new Error('Gemini rate limit reached. Try again in a few seconds.');
        }
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          try {
            const parsedErr = JSON.parse(lastErrText);
            const msg = parsedErr.error?.message || lastErrText.slice(0, 150);
            throw new Error(`Gemini API Error (${response.status}): ${msg}`);
          } catch (e) {
            if (e.message.startsWith('Gemini API Error')) throw e;
            throw new Error(`Gemini API Error (${response.status}): ${lastErrText.slice(0, 150)}`);
          }
        }
        break;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      if (err.message.startsWith('Gemini API Error') || err.message.includes('rate limit')) {
        throw err;
      }
      lastErrText = err.message;
    }
  }

  throw new Error(`Gemini patch generation failed: ${lastErrText || 'No response from model'}`);
}
