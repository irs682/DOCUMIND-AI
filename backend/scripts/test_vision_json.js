const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testVisionJson() {
  const imagePath = path.join(__dirname, '../uploads/docx_images_test/image2.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;

  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();

  const prompt = `Analyze this document figure strictly from visible evidence.
Respond ONLY in valid JSON matching this schema:
{
  "figure_type": "string (e.g. sequence_diagram, architecture_diagram, flowchart, chart)",
  "participants": ["string"],
  "labels": ["string"],
  "interactions": [
    {
      "order": 1,
      "from": "string",
      "to": "string",
      "action": "string"
    }
  ],
  "visual_description": "string",
  "numerical_values": ["string"],
  "uncertainty": "string or null"
}
Do not infer details not visible in the image. Do not use external knowledge.`;

  console.log("Calling OpenRouter with openai/gpt-4o-mini for structured vision extraction...");
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'DOCUMIND-AI',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  const data = await res.json();
  const rawContent = data.choices[0].message.content;
  console.log("RAW VISION RESPONSE:\n", rawContent);

  const jsonClean = rawContent.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(jsonClean);
  console.log("\nPARSED PARTICIPANTS:", parsed.participants);
  console.log("\nPARSED INTERACTIONS COUNT:", parsed.interactions.length);
  parsed.interactions.forEach(i => console.log(`  ${i.order}. [${i.from}] -> [${i.to}]: ${i.action}`));
}

testVisionJson().catch(console.error);
