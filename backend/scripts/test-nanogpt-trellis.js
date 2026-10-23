// backend/scripts/test-nanogpt-trellis.js
//
// Test NanoGPT's TRELLIS.2 image-to-3D endpoint.
// $0.20 per model at 1024 resolution.
//
// Run with: node scripts/test-nanogpt-trellis.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  const apiKey = process.env.NANOGPT_API_KEY;
  if (!apiKey) {
    console.error('❌ NANOGPT_API_KEY not set in .env');
    return;
  }

  // 1. Load a test image
  const imgPath = path.join(__dirname, '..', 'uploads', 'products');
  const files = fs.readdirSync(imgPath).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) {
    console.error('❌ No images found in uploads/products');
    return;
  }
  const preferred = files.find(f => /\.(jpg|jpeg)$/i.test(f)) || files[0];
  const imgFile = path.join(imgPath, preferred);
  console.log('Using image:', imgFile);

  // 2. Convert to base64 data URL
  const imageBuffer = fs.readFileSync(imgFile);
  const ext = path.extname(imgFile).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const imageDataUrl = `data:${mime};base64,${imageBuffer.toString('base64')}`;
  console.log('Data URL length:', imageDataUrl.length, 'chars');

  // 3. Submit generation
  console.log('\nSubmitting to NanoGPT TRELLIS.2...');
  const submitRes = await fetch('https://nano-gpt.com/api/generate-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'wavespeed-ai/trellis-2/image-to-3d',
      imageDataUrl,
      resolution: '1024',
      texture_size: 2048,
      target_face_count: 200000,
      remove_background: true,
      seed: -1,
    }),
  });

  if (!submitRes.ok) {
    console.error('Submit failed:', submitRes.status);
    console.error((await submitRes.text()).slice(0, 1000));
    return;
  }

  let job = await submitRes.json();
  console.log('\n--- Submit response ---');
  console.log(JSON.stringify(job, null, 2));

  // 4. Poll for completion
  const runId = job.id || job.runId || job.run_id;
  if (!runId) {
    console.log('⚠️ No run ID found in response. Inspect above.');
    return;
  }

  console.log(`\nPolling run ${runId}...`);
  let attempts = 0;
  while (attempts++ < 60) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://nano-gpt.com/api/generate-video/${runId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) {
      console.error('Poll failed:', pollRes.status);
      console.error((await pollRes.text()).slice(0, 500));
      return;
    }
    job = await pollRes.json();
    const status = job.status || job.state;
    console.log(`  status: ${status}`);

    if (status === 'completed' || status === 'succeeded' || status === 'done') {
      console.log('\n--- Final result ---');
      console.log(JSON.stringify(job, null, 2));
      const glbUrl = job.output?.glb || job.output?.url || job.result?.glb || job.glb_url;
      if (glbUrl) {
        console.log('\n✅ GLB URL:', glbUrl);
      } else {
        console.log('⚠️ No GLB URL found. Inspect the final result above.');
      }
      return;
    }

    if (status === 'failed' || status === 'error') {
      console.log('\n❌ Generation failed.');
      console.log(JSON.stringify(job, null, 2));
      return;
    }
  }
  console.log('❌ Timed out after 5 minutes.');
}

main().catch(err => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});