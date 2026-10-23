// backend/scripts/test-threews.js
//
// Test the free, keyless three.ws image-to-3D Forge API.
// Returns a textured GLB URL. No API key required.
//
// Run with: node scripts/test-threews.js

async function main() {
  // Replace this with a public URL of one of YOUR product images
  // once the pipeline is proven.
  const TEST_IMAGE_URL =
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800';

  console.log('1. Submitting image to three.ws /api/forge...');
  const start = await fetch('https://three.ws/api/forge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      image_urls: [TEST_IMAGE_URL],
      tier: 'draft', // 'draft' is the free lane
    }),
  }).then((r) => r.json());

  console.log('   Initial response:', JSON.stringify(start, null, 2));

  // If the lane completes inline, we already have the GLB.
  if (start.glb_url) {
    console.log('\n✅ Textured GLB URL:', start.glb_url);
    return;
  }

  if (!start.job_id) {
    console.log('❌ No job_id or glb_url returned. Inspect the response above.');
    return;
  }

  // Otherwise, poll until the job is done.
  console.log(`\n2. Job queued: ${start.job_id}. Polling...`);
  let job = start;
  let attempts = 0;
  while (job.status !== 'done' && job.status !== 'failed') {
    if (attempts++ > 60) {
      console.log('❌ Timed out after 60 polls.');
      return;
    }
    const waitMs = (job.retryAfter || 5) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    job = await fetch(
      `https://three.ws/api/forge?job=${encodeURIComponent(start.job_id)}`
    ).then((r) => r.json());
    console.log(`   Status: ${job.status}${job.etaSeconds ? ` (ETA ${job.etaSeconds}s)` : ''}`);
  }

  if (job.status === 'done' && job.glb_url) {
    console.log('\n✅ Textured GLB URL:', job.glb_url);
    console.log('   Viewer URL:', job.viewerUrl || '(not provided)');
    console.log('   AR URL:', job.arUrl || '(not provided)');
  } else {
    console.log('\n❌ Job failed:', JSON.stringify(job, null, 2));
  }
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});