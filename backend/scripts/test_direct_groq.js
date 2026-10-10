const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testDirectGroq() {
  const apiKey = (process.env.GROQ_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const model = process.env.GROQ_MODEL;

  console.log(`[TEST] Testing direct Groq API with model: "${model}"`);
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    console.error('[TEST] ERROR: GROQ_API_KEY is not configured or invalid.');
    process.exit(1);
  }
  if (!model) {
    console.error('[TEST] ERROR: GROQ_MODEL is not set in backend/.env.');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: 'Reply only with: GROQ WORKING',
          },
        ],
        max_completion_tokens: 20,
      }),
    });

    const body = await response.text();
    console.log('STATUS:', response.status);
    console.log('RESPONSE:', body);

    if (response.ok) {
      console.log('\n✅ DIRECT GROQ API TEST PASSED (HTTP 200)');
    } else {
      console.error(`\n❌ DIRECT GROQ API TEST FAILED (HTTP ${response.status})`);
    }
  } catch (err) {
    console.error('[TEST] Direct fetch error:', err.message);
  }
}

testDirectGroq();

