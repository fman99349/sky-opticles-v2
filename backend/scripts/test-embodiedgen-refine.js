// backend/scripts/test-embodiedgen-refine.js
//
// Discover the API schema for HorizonRobotics/EmbodiedGen-Texture-Gen.
//
// Run with: node scripts/test-embodiedgen-refine.js

async function main() {
  console.log('Fetching API schema from EmbodiedGen-Texture-Gen...');
  const res = await fetch(
    'https://huggingface.co/spaces/HorizonRobotics/EmbodiedGen-Texture-Gen/gradio_api/info'
  );
  if (!res.ok) {
    console.error('Schema fetch failed:', res.status, await res.text());
    return;
  }
  const info = await res.json();

  const endpoints = info?.named_endpoints
    ? Object.keys(info.named_endpoints)
    : [];

  console.log('\nAvailable endpoints:');
  for (const name of endpoints) {
    console.log('  •', name);
  }

  // Print parameter details for each endpoint
  for (const name of endpoints) {
    const ep = info.named_endpoints[name];
    console.log(`\n--- ${name} ---`);
    console.log('Parameters:');
    for (const p of ep.parameters || []) {
      console.log(`  - ${p.parameter_name} (${p.type})${p.parameter_default ? ` default=${p.parameter_default}` : ''}`);
    }
    console.log('Returns:');
    for (const r of ep.returns || []) {
      console.log(`  - ${r.type}`);
    }
  }
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});