const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testVision() {
  const imagePath = path.join(__dirname, '../uploads/docx_images_test/image2.png');
  if (!fs.existsSync(imagePath)) {
    console.error('image2.png not found');
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;

  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const modelsToTest = [
    'google/gemini-2.0-flash-001',
    'google/gemini-flash-1.5',
    'meta-llama/llama-3.2-11b-vision-instruct',
    'openai/gpt-4o-mini',
  ];

  for (const model of modelsToTest) {
    console.log(`\nTesting vision with model: ${model}...`);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'DOCUMIND-AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this document figure strictly from visible evidence.\nReturn:\n1. figure type\n2. visible entities/participants\n3. visible labels\n4. relationships/arrows\n5. interaction order if this is a sequence/process diagram\n6. visible numerical values\n7. uncertainty\nDo not infer details not visible in the image. Do not use external knowledge.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices && data.choices[0]) {
        console.log(`✅ SUCCESS with ${model}:`);
        console.log(data.choices[0].message.content.slice(0, 500));
        return { model, content: data.choices[0].message.content };
      } else {
        console.warn(`❌ Failed with ${model}:`, data.error?.message || res.status);
      }
    } catch (err) {
      console.warn(`❌ Error with ${model}:`, err.message);
    }
  }
}

testVision();
