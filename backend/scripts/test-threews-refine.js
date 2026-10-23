// backend/scripts/test-threews-refine.js
//
// Test the free three.ws refine_model endpoint.
// Takes an existing GLB URL and an instruction, returns a refined GLB URL.
//
// Run with: node scripts/test-threews-refine.js

async function main() {
  // Use the GLB URL from a previous generation (e.g., the one you already saved).
  const existingGlbUrl =
    'https://storage.googleapis.com/three-ws-avatar-reconstructions/raw-meshes/trellis/b4d1277c-31da-495d-8ad5-d5d2dfaf733e.glb';

  const instruction =
    'Improve the color accuracy and texture sharpness. Make the frame material look like glossy acetate and the lenses clearer.';

  console.log('1. Submitting refine request to three.ws /api/forge-iterate...');
  const submitRes = await fetch('https://three.ws/api/forge-iterate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      glb_url: existingGlbUrl,
      instruction: instruction,
    }),
  });

  if (!submitRes.ok) {
    console.error('Submit failed:', submitRes.status, await submitRes.text());
    return;
  }

  let job = await submitRes.json();
  console.log('   Initial response:', JSON.stringify(job, null, 2).slice(0, 600));

  // If it returns a glb_url directly, we are done.
  if (job.glb_url) {
    console.log('\n✅ Refined GLB URL:', job.glb_url);
    return;
  }

  // Otherwise poll the job.
  if (!job.job_id) {
    console.log('❌ No job_id or glb_url. Inspect the response above.');
    return;
  }

  console.log(`\n2. Job queued: ${job.job_id}. Polling...`);
  let attempts = 0;
  while (job.status !== 'done' && job.status !== 'failed') {
    if (attempts++ > 60) {
      console.log('❌ Timed out.');
      return;
    }
    const waitMs = (job.retryAfter || 5) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    const pollRes = await fetch(
      `https://three.ws/api/forge-iterate?job=${encodeURIComponent(job.job_id)}`
    );
    job = await pollRes.json();
    console.log(`   Status: ${job.status}`);
  }

  if (job.status === 'done' && job.glb_url) {
    console.log('\n✅ Refined GLB URL:', job.glb_url);
  } else {
    console.log('\n❌ Refine failed:', JSON.stringify(job, null, 2));
  }
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});