// backend/scripts/test-mcp-refine.js
//
// Test the FREE three.ws refine_model tool via the MCP studio endpoint.
// No account, no API key, no payment.
//
// Run with: node scripts/test-mcp-refine.js

async function main() {
  // Use the GLB URL from your existing generation.
  // Replace this with the glb_url you received from three.ws.
  const existingGlbUrl =
    'https://storage.googleapis.com/three-ws-avatar-reconstructions/raw-meshes/trellis/b4d1277c-31da-495d-8ad5-d5d2dfaf733e.glb';

  const instruction =
    'Improve the colour accuracy and texture sharpness. Make the frame material look like glossy acetate and the lenses clearer.';

  console.log('1. Calling free three.ws /api/mcp-studio refine_model...');
  console.log('   GLB:', existingGlbUrl);
  console.log('   Instruction:', instruction);

  // MCP JSON-RPC request to invoke a tool
  const requestBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'refine_model',
      arguments: {
        glb_url: existingGlbUrl,
        instruction: instruction,
      },
    },
  };

  const res = await fetch('https://three.ws/api/mcp-studio', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ HTTP error:', res.status);
    console.error(text.slice(0, 1000));
    return;
  }

  const result = await res.json();
  console.log('\n--- Raw response ---');
  console.log(JSON.stringify(result, null, 2));

  // MCP responses wrap the tool result inside result.content
  const toolResult = result?.result?.content?.[0]?.text;
  if (toolResult) {
    try {
      const parsed = JSON.parse(toolResult);
      console.log('\n--- Parsed tool result ---');
      console.log(JSON.stringify(parsed, null, 2));

      // Look for the refined GLB URL
      const glbUrl =
        parsed?.glbUrl ||
        parsed?.glb_url ||
        parsed?.model?.glbUrl ||
        parsed?.model?.glb_url;

      if (glbUrl) {
        console.log('\n✅ Refined GLB URL:', glbUrl);
      } else if (parsed?.job_id || parsed?.jobId) {
        console.log('\n⏳ Job queued. job_id:', parsed.job_id || parsed.jobId);
        console.log('   You may need to poll with check_job.');
      } else {
        console.log('\n⚠️ No glbUrl or job_id found. Inspect the parsed result above.');
      }
    } catch {
      console.log('\n⚠️ Could not parse tool result as JSON:', toolResult.slice(0, 500));
    }
  }
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  if (err.stack) console.error(err.stack);
});