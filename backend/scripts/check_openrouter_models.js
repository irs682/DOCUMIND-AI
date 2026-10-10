require('dotenv').config();
const https = require('https');

const apiKey = (process.env.OPENROUTER_API_KEY || '').replace(/^["']|["']$/g, '').trim();
const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

async function checkModels() {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'DOCUMIND-AI',
      }
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Status: ${res.status}`, data);
      return;
    }
    const modelIds = (data.data || []).map(m => m.id);
    console.log(`Total models returned: ${modelIds.length}`);
    const meta33 = modelIds.filter(id => id.includes('llama-3.3') || id.includes('llama-3.1'));
    console.log('Llama models:', meta33.slice(0, 10));
    const freeModels = modelIds.filter(id => id.endsWith(':free'));
    console.log('Free models:', freeModels.slice(0, 10));
  } catch (err) {
    console.error('Error fetching models:', err.message);
  }
}

checkModels();
