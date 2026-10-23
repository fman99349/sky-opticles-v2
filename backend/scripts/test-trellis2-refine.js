// backend/scripts/test-trellis2-refine.js
//
// Verify that the TRELLIS.2 Space exposes a texturing endpoint.
// If it does, we will wire it into the production route.
//
// Run with: node scripts/test-trellis2-refine.js

require('dotenv').config();

async function main() {
  console.log('Fetching API schema from microsoft/TRELLIS.2...');
  const res = await fetch('https://microsoft-trellis-2.hf.space/gradio_api/info');
  if (!res.ok) {
    console.error('Failed to fetch schema:', res.status, await res.text());
    return;
  }
  const info = await res.json();

  // The schema lists named endpoints under "named_endpoints"
  const endpoints = info?.named_endpoints
    ? Object.keys(info.named_endpoints)
    : [];

  console.log('\nAvailable endpoints:');
  for (const name of endpoints) {
    console.log('  •', name);
  }

  // Look for anything that sounds like texturing
  const textureEndpoints = endpoints.filter((e) =>
    /texture|texturing|pbr|paint/i.test(e)
  );

  if (textureEndpoints.length > 0) {
    console.log('\n✅ Texturing endpoint(s) found:');
    for (const name of textureEndpoints) {
      const ep = info.named_endpoints[name];
      console.log(`\n  Endpoint: ${name}`);
      console.log('  Parameters:');
      for (const p of ep.parameters || []) {
        console.log(`    - ${p.parameter_name} (${p.type})`);
      }
      console.log('  Returns:');
      for (const r of ep.returns || []) {
        console.log(`    - ${r.type}`);
      }
    }
  } else {
    console.log('\n⚠️  No texturing endpoint found in the schema.');
    console.log('The Space may only expose image-to-3D generation.');
    console.log('Fallback: use HorizonRobotics/EmbodiedGen-Texture-Gen.');
  }
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});