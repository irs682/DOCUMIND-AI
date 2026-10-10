const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function check() {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Key info:', JSON.stringify(data, null, 2));
}

check().catch(console.error);
