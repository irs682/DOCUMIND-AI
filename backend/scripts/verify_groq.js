const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyGroq() {
  const apiKey = (process.env.GROQ_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const configuredModel = (process.env.GROQ_MODEL || '').trim();
  const configuredFastModel = (process.env.GROQ_FAST_MODEL || '').trim();

  if (!apiKey) {
    console.error('[LLM] ERROR: GROQ_API_KEY is not configured in backend/.env');
    process.exit(1);
  }

  console.log('[LLM] Verifying Groq API credentials and models...');
  
  let availableModels = [];
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LLM] ERROR: Failed to query /models (HTTP ${res.status}): ${errText}`);
      process.exit(1);
    }

    const data = await res.json();
    availableModels = (data.data || []).map((m) => m.id).sort();
  } catch (netErr) {
    console.error(`[LLM] Network error querying Groq /models: ${netErr.message}`);
    process.exit(1);
  }

  console.log('\n[LLM] Available Groq model IDs for this project:');
  availableModels.forEach((id) => console.log(`  - ${id}`));

  let activeModel = configuredModel;
  if (!availableModels.includes(configuredModel)) {
    console.warn(`\n[LLM] WARNING: Configured GROQ_MODEL "${configuredModel}" is not in available models!`);
    const preferredCandidates = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ];
    activeModel = preferredCandidates.find((c) => availableModels.includes(c)) || availableModels[0];
    console.log(`[LLM] Selected fallback from available models: ${activeModel}`);
  } else {
    console.log(`\n[LLM] Configured GROQ_MODEL "${configuredModel}" is verified present.`);
  }

  // Direct chat completion test
  console.log(`\n[LLM] Performing direct chat completion test with model: ${activeModel}`);
  try {
    const testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [{ role: 'user', content: 'Reply only with GROQ WORKING' }],
        max_tokens: 15,
        temperature: 0.0,
      }),
    });

    const responseBody = await testRes.json();
    if (!testRes.ok) {
      console.error(`[LLM] Direct test failed (HTTP ${testRes.status}):`, JSON.stringify(responseBody));
      process.exit(1);
    }

    const reply = responseBody.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[LLM] Groq response: "${reply}"`);
    console.log(`[LLM] provider=groq`);
    console.log(`[LLM] model=${activeModel}`);
    console.log(`[LLM] direct_test=success`);
  } catch (testErr) {
    console.error(`[LLM] Direct test error: ${testErr.message}`);
    process.exit(1);
  }
}

verifyGroq();
