const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function discoverGroqModels() {
  const apiKey = (process.env.GROQ_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    console.error('❌ No valid GROQ_API_KEY found in backend/.env');
    process.exit(1);
  }

  console.log('======================================================================');
  console.log('🔍 QUERYING GROQ /models ENDPOINT WITH CURRENT API KEY');
  console.log('======================================================================');

  let availableModels = [];
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`❌ Groq model discovery failed (${response.status}):`, data?.error?.message || data);
      process.exit(1);
    }

    availableModels = (data.data || []).map((m) => m.id).sort();
  } catch (err) {
    console.error('❌ Network error during Groq model discovery:', err.message);
    process.exit(1);
  }

  console.log('\nAvailable Groq models:');
  availableModels.forEach((id) => console.log(`- ${id}`));

  // Rank suitable main models (preferring strongest general purpose / reasoning models)
  const mainCandidates = [
    'llama-3.3-70b-versatile',
    'llama-3.3-70b-specdec',
    'llama-3.1-70b-versatile',
    'llama-3.2-90b-vision-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama-3.2-3b-preview',
    'llama3-8b-8192',
  ];

  const fastCandidates = [
    'llama-3.1-8b-instant',
    'llama-3.2-3b-preview',
    'llama-3.2-1b-preview',
    'llama3-8b-8192',
    'gemma2-9b-it',
  ];

  const recommendedMain = mainCandidates.find((c) => availableModels.includes(c)) || availableModels[0];
  const recommendedFast = fastCandidates.find((c) => availableModels.includes(c)) || recommendedMain;

  console.log('\n----------------------------------------------------------------------');
  console.log(`Recommended main: ${recommendedMain}`);
  console.log(`Recommended fast: ${recommendedFast}`);
  console.log('----------------------------------------------------------------------');

  if (recommendedMain) {
    console.log(`\n🧪 Testing direct completion on recommended main model: "${recommendedMain}"...`);
    try {
      const testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: recommendedMain,
          messages: [{ role: 'user', content: 'Reply only with: GROQ WORKING' }],
          max_completion_tokens: 15,
        }),
      });

      const testBody = await testRes.text();
      console.log(`STATUS: ${testRes.status}`);
      console.log(`RESPONSE: ${testBody}`);
      if (testRes.ok) {
        console.log(`\n✅ Model "${recommendedMain}" is active and verified working!`);
      } else {
        console.error(`\n❌ Direct test on "${recommendedMain}" failed with HTTP ${testRes.status}`);
      }
    } catch (testErr) {
      console.error('❌ Direct test fetch error:', testErr.message);
    }
  }
}

discoverGroqModels();

