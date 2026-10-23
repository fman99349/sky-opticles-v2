// backend/scripts/test-trellis.js
//
// Standalone test for Replicate firtoz/trellis.
// Reads one image from uploads/products, generates a textured GLB,
// and prints the output URL. Does NOT touch the database or routes.
//
// Run with: node scripts/test-trellis.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

async function main() {
  console.log('1. Initializing Replicate...');
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  console.log('2. Loading a local test image...');
  const imgPath = path.join(__dirname, '..', 'uploads', 'products');
  const files = fs.readdirSync(imgPath).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) {
    console.log('   ❌ No images found in uploads/products');
    return;
  }
  const preferred = files.find(f => /\.(jpg|jpeg)$/i.test(f)) || files[0];
  const imgFile = path.join(imgPath, preferred);
  console.log('   Using image:', imgFile);

  const imageBuffer = fs.readFileSync(imgFile);
  const ext = path.extname(imgFile).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';

  console.log('3. Calling firtoz/trellis (this takes ~26 seconds)...');
  const start = Date.now();

  const output = await replicate.run(
  'firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
  {
    input: {
      image: imageBuffer, // SDK uploads local files automatically
      seed: 0,
      randomize_seed: true,
      texture_size: 1024,
      mesh_simplify: 0.95,
      generate_model: true,   // ← REQUIRED: this makes it output a .glb
      generate_color: true,
      generate_normal: false,
      ss_sampling_steps: 12,
      slat_sampling_steps: 12,
      ss_guidance_strength: 7.5,
      slat_guidance_strength: 3,
    },
  });

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`4. Finished in ${elapsed}s.`);

  console.log('\n--- Raw output ---');
  console.log(JSON.stringify(output, null, 2));

  // The model returns an array; the .glb is typically the last element.
  let glbUrl = null;
  if (Array.isArray(output)) {
    glbUrl = output.find(u => typeof u === 'string' && u.includes('.glb'));
  } else if (typeof output === 'string') {
    glbUrl = output;
  }

  if (glbUrl) {
    console.log('\n✅ GLB URL:', glbUrl);
  } else {
    console.log('\n⚠️  No .glb URL found in output. Inspect the raw output above.');
  }
}

main().catch(err => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});