// backend/scripts/test-3d-gen.js
//
// Test the Pixal3D Studio pipeline to get a textured GLB.
// This version uses the Studio Space, which has a more efficient
// final extraction step that avoids ZeroGPU time limits.
//
// Run with: node scripts/test-3d-gen.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

async function downloadToTemp(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${filename}`);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function main() {
  console.log('1. Importing @gradio/client...');
  const { Client, handle_file } = await import('@gradio/client');

  console.log('2. Connecting to victor/pixal3d-studio...');
  const app = await Client.connect('victor/pixal3d-studio', {
    token: process.env.HF_TOKEN,
  });
  console.log('   Connected.');

  console.log('3. Loading a test image...');
  const imgPath = path.join(__dirname, '..', 'uploads', 'products');
  const files = fs.readdirSync(imgPath).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) {
    console.log('   ❌ No images found in uploads/products');
    return;
  }
  const preferred = files.find(f => /\.(jpg|jpeg)$/i.test(f)) || files[0];
  const imgFile = path.join(imgPath, preferred);
  console.log('   Using image:', imgFile);

  const sessionId = `test-${Date.now()}`;

  // The Studio Space has a single, combined endpoint for the whole process.
   console.log('\n4. Calling /generate_fast (this may take 1-2 minutes)...');
  
  const result = await app.predict('/generate_fast', {
    image: handle_file(imgFile),
    prompt: 'A pair of eyeglasses',
    seed: -1,
    resolution: 512,
    quality: 'draft',
    manual_fov: -1.0,
    share_to_community: false,
  });

  console.log('\n--- Extraction ---');
  console.log(JSON.stringify(result, null, 2));

  // The result is a JSON string. Parse it.
  const raw = result?.data?.[0];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (parsed?.ok && parsed?.asset?.model_url) {
    console.log('✅ Textured GLB URL:', parsed.asset.model_url);
  } else {
    console.log('❌ Space returned an error:', parsed?.error || 'Unknown error');
  }

  console.log('\n--- Extraction ---');
  console.log(JSON.stringify(result, null, 2));

  // The result should be a FileData object for the generated GLB.
  const glbData = result?.data?.[0];
  if (glbData?.url) {
    console.log('✅ Textured GLB URL:', glbData.url);
  } else {
    console.log('❌ Could not find a .url in the extraction result.');
  }
}

main().catch(err => {
  console.error('❌ FAILED:');
  console.error('   message:', err.message);
  if (err.stack) console.error('   stack:', err.stack);
});