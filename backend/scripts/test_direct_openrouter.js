const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testDirectOpenRouter() {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const model = process.env.OPENROUTER_MODEL || process.env.DEFAULT_LLM_MODEL;

  console.log(`[TEST] Testing direct OpenRouter API with model: "${model}"`);

  if (!apiKey || !apiKey.startsWith('sk-or-')) {
    console.error('[TEST] ERROR: OPENROUTER_API_KEY is not configured or invalid.');
    process.exit(1);
  }
  if (!model) {
    console.error('[TEST] ERROR: OPENROUTER_MODEL is not configured in backend/.env.');
    process.exit(1);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'DOCUMIND-AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: 'Reply only with: OPENROUTER WORKING',
          },
        ],
        max_tokens: 30,
      }),
    });

    const body = await response.text();
    console.log('STATUS:', response.status);
    console.log('RESPONSE:', body);

    if (response.ok) {
      console.log('\n✅ DIRECT OPENROUTER API TEST PASSED (HTTP 200)');
    } else {
      console.error(`\n❌ DIRECT OPENROUTER API TEST FAILED (HTTP ${response.status})`);
    }
  } catch (err) {
    console.error('[TEST] Direct fetch error:', err.message);
  }
}

testDirectOpenRouter();
