const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
  const src = path.resolve('backend/uploads/extracted_images/file-1791385130374-343492558/docx_fig_3_rId8.png');
  const dst = path.resolve('backend/uploads/extracted_images/file-1791385130374-343492558/test_small.png');
  
  execSync(`python -c "from PIL import Image; im = Image.open(r'${src}'); im.thumbnail((1024, 1024)); im.save(r'${dst}')"`);
  console.log('Resized image created. File size:', fs.statSync(dst).size);

  const imgBuffer = fs.readFileSync(dst);
  const base64Data = imgBuffer.toString('base64');
  const apiKey = process.env.OPENROUTER_API_KEY || '';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this sequence diagram. List all participants and interactions.' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,' + base64Data } }
          ]
        }
      ],
      max_tokens: 1000
    })
  });

  console.log('Status:', res.status);
  const data = await res.json();
  if (data.choices) {
    console.log('SUCCESS:', data.choices[0].message.content.slice(0, 400));
  } else {
    console.log('ERROR:', data);
  }
}

run().catch(console.error);
