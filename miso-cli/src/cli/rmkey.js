import { loadConfig, saveConfig } from '../config.js';

export function handleRmKey(args = []) {
  const argStr = args.join(' ').toLowerCase();

  const isGemini = argStr.includes('--gemini') || argStr.includes('gemini');
  const isGrok   = argStr.includes('--grok') || argStr.includes('--groq') || argStr.includes('grok') || argStr.includes('groq');

  if (!isGemini && !isGrok) {
    console.error('\x1b[31mError: Please specify provider to remove: --gemini or --grok (--groq)\x1b[0m');
    console.log('Usage: npx miso rmkey --gemini OR npx miso rmkey --grok\n');
    return;
  }

  const config = loadConfig();

  if (isGemini) {
    config.geminiApiKey = '';
    config.allowStaticOnly = false;
    process.env.GEMINI_API_KEY = '';
    process.env.MISO_GEMINI_API_KEY = '';
    process.env.GOOGLE_API_KEY = '';
    saveConfig(config);
    console.log('\x1b[32m✔ Gemini API key removed successfully.\x1b[0m');
    console.log('\x1b[33mNext scan will require an API key to proceed.\x1b[0m\n');
  }

  if (isGrok) {
    config.groqApiKey = '';
    config.allowStaticOnly = false;
    process.env.GROQ_API_KEY = '';
    process.env.MISO_GROQ_API_KEY = '';
    saveConfig(config);
    console.log('\x1b[32m✔ Grok / Groq API key removed successfully.\x1b[0m');
    console.log('\x1b[33mNext scan will require an API key to proceed.\x1b[0m\n');
  }
}
