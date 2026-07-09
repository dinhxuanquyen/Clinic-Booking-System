import { env } from '../config/env.js';
import { GEMINI_MODEL, hasUsableGeminiKey, keyPrefix } from '../services/geminiService.js';

async function main() {
  const hasKey = Boolean(env.geminiApiKey);
  console.log('[Gemini test] GEMINI_API_KEY exists:', hasKey);
  if (hasKey) console.log('[Gemini test] key prefix:', keyPrefix());
  console.log('[Gemini test] model:', GEMINI_MODEL);

  if (!hasKey || !hasUsableGeminiKey()) {
    throw new Error('Gemini API key missing or invalid');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  console.log('[Gemini test] endpoint:', endpoint);
  const response = await fetch(
    `${endpoint}?key=${encodeURIComponent(env.geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Chỉ trả về JSON hợp lệ: {"summary":"test"}' }]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  console.log('[Gemini test] HTTP status:', response.status);
  const text = await response.text();
  console.log('[Gemini test] raw response:', text.slice(0, 1000));

  if (!response.ok) {
    throw new Error(`Gemini test failed with status ${response.status}`);
  }
}

main().catch((error) => {
  console.error('[Gemini test] failed:', error.message);
  process.exitCode = 1;
});
