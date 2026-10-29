const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const os = require('os');
const { requireAdmin } = require('./adminAuth');
const { requireShopAccess, canAccessShop } = require('../middleware/shopAccess');

const router = express.Router();

const MODELS_DIR = path.join(__dirname, '..', '..', 'uploads', 'models');
fs.mkdirSync(MODELS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MODELS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.glb', '.gltf'].includes(ext)) return cb(null, true);
    cb(new Error('Only .glb or .gltf files are allowed.'));
  },
});

// ---------------------------------------------------------------------------
// Shop ownership middleware for 3D model routes
// ---------------------------------------------------------------------------
// These routes use :id for two different resources:
//   /products/:id/3d-models           -> :id is a product id
//   /3d-models/:id                    -> :id is a model id
// So we need two access middlewares, each resolving through the parent product.

async function loadProductShopId(productId) {
  const r = await pool.query('SELECT shop_id FROM products WHERE id = $1', [productId]);
  return r.rows[0]?.shop_id ?? null;
}

async function loadModelParentShopId(modelId) {
  const r = await pool.query(
    `SELECT p.shop_id
       FROM product_3d_models m
       JOIN products p ON p.id = m.product_id
      WHERE m.id = $1`,
    [modelId]
  );
  return r.rows[0]?.shop_id ?? null;
}

// Verifies the caller can access the product in :id.
// Returns 404 (not 403) when it exists but belongs to another shop.
async function requireProductAccess(req, res, next) {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const shopId = await loadProductShopId(productId);
    if (shopId === null || !canAccessShop(req, shopId)) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    req._shopId = shopId;
    next();
  } catch (err) {
    console.error('Product access check failed:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

// Verifies the caller can access the 3D model in :id.
async function requireModelAccess(req, res, next) {
  const modelId = Number(req.params.id);
  if (!Number.isInteger(modelId) || modelId < 1) {
    return res.status(400).json({ error: 'Invalid model ID.' });
  }
  try {
    const shopId = await loadModelParentShopId(modelId);
    if (shopId === null || !canAccessShop(req, shopId)) {
      return res.status(404).json({ error: '3D model not found.' });
    }
    req._shopId = shopId;
    next();
  } catch (err) {
    console.error('Model access check failed:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

// POST /api/products/:id/3d-models
router.post('/products/:id/3d-models', requireAdmin, requireShopAccess, requireProductAccess, upload.single('model'), async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send a .glb under field "model".' });
  }

  const variantId = req.body.variantId ? Number(req.body.variantId) : null;
  const isPrimary = req.body.isPrimary !== 'false';
  const modelUrl = `/uploads/models/${req.file.filename}`;
  const format = path.extname(req.file.originalname).replace('.', '').toLowerCase();

  try {
    if (isPrimary) {
      await pool.query(
        `UPDATE product_3d_models SET is_primary = FALSE
         WHERE product_id = $1
           AND COALESCE(variant_id, 0) = COALESCE($2::bigint, 0)`,
        [productId, variantId]
      );
    }
    const result = await pool.query(
      `INSERT INTO product_3d_models
         (product_id, variant_id, model_url, format, file_size_bytes, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [productId, variantId, modelUrl, format, req.file.size, isPrimary]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Upload 3D model failed:', error.message);
    res.status(500).json({ error: 'Could not save 3D model record.' });
  }
});

// GET /api/products/:id/3d-models
router.get('/products/:id/3d-models', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const result = await pool.query(
      `SELECT * FROM product_3d_models WHERE product_id = $1
       ORDER BY is_primary DESC, variant_id NULLS FIRST, id ASC`,
      [productId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List 3D models failed:', error.message);
    res.status(500).json({ error: 'Could not list 3D models.' });
  }
});

// DELETE /api/3d-models/:id
router.delete('/3d-models/:id', requireAdmin, requireShopAccess, requireModelAccess, async (req, res) => {
  const modelId = Number(req.params.id);
  if (!Number.isInteger(modelId) || modelId < 1) {
    return res.status(400).json({ error: 'Invalid model ID.' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM product_3d_models WHERE id = $1 RETURNING model_url',
      [modelId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '3D model not found.' });
    }
    const url = result.rows[0].model_url;
    if (url && url.startsWith('/uploads/models/')) {
      const filename = url.replace('/uploads/models/', '');
      try { fs.unlinkSync(path.join(MODELS_DIR, filename)); } catch {}
    }
    res.json({ data: { id: modelId, deleted: true } });
  } catch (error) {
    console.error('Delete 3D model failed:', error.message);
    res.status(500).json({ error: 'Could not delete 3D model.' });
  }
});

// POST /api/products/:id/generate-3d-model
// Generates a 3D model from the product's primary image using the
// free tencent/Hunyuan3D-2 Hugging Face Space.
// POST /api/products/:id/generate-3d-model
// Generates a textured 3D model from the product's primary image using
// the free, keyless three.ws Forge API (which routes to TRELLIS/Hunyuan3D).
// POST /api/products/:id/generate-3d-model?provider=auto|nanogpt|threews
//
// Generates a 3D model from the product's primary image.
//   nanogpt  -> NanoGPT TRELLIS.2, $0.20/model, high quality (requires balance)
//   threews  -> three.ws free lane, low quality, no cost
//   auto     -> try NanoGPT first, fall back to three.ws on any failure
//
// Downloads the GLB, saves it to uploads/models/, and inserts a DB row.
router.post('/products/:id/generate-3d-model', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  const provider = String(req.query.provider || 'auto').toLowerCase();

  try {
    // 1. Fetch product name + primary image path
    const productRes = await pool.query(
      `SELECT p.name,
              (SELECT pi.image_url FROM product_images pi
               WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image
       FROM products p WHERE p.id = $1`,
      [productId]
    );
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const { primary_image: imagePath, name: productName } = productRes.rows[0];
    if (!imagePath) {
      return res.status(400).json({ error: 'Product has no primary image.' });
    }

    // 2. Resolve to a local file path
    const PRODUCTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'products');
    let imageLocalPath;
    if (typeof imagePath === 'string' && imagePath.startsWith('/uploads/products/')) {
      imageLocalPath = path.join(PRODUCTS_DIR, imagePath.replace('/uploads/products/', ''));
      if (!fs.existsSync(imageLocalPath)) {
        throw new Error(`Primary image not found on disk: ${imageLocalPath}`);
      }
    } else {
      const imgRes = await fetch(imagePath);
      if (!imgRes.ok) throw new Error(`Failed to download image (HTTP ${imgRes.status})`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const ext = path.extname(imagePath.split('?')[0]) || '.jpg';
      imageLocalPath = path.join(os.tmpdir(), `3dgen-${productId}-${Date.now()}${ext}`);
      fs.writeFileSync(imageLocalPath, buf);
    }

    // 3. Provider dispatch
    let glbUrl = null;
    let usedProvider = null;

    const tryNanoGPT = provider === 'nanogpt' || provider === 'auto';
    const tryThreeWS = provider === 'threews' || provider === 'auto';

    if (tryNanoGPT) {
      try {
        console.log(`[3D gen] Trying NanoGPT TRELLIS.2...`);
        glbUrl = await generateViaNanoGPT(imageLocalPath);
        usedProvider = 'nanogpt';
        console.log(`[3D gen] âœ… NanoGPT produced GLB`);
      } catch (err) {
        console.warn(`[3D gen] NanoGPT failed: ${err.message}`);
        if (provider === 'nanogpt') throw err; // explicit request â€” don't fall back
      }
    }

    if (!glbUrl && tryThreeWS) {
      console.log(`[3D gen] Trying three.ws free lane...`);
      glbUrl = await generateViaThreeWS(imageLocalPath, productName);
      usedProvider = 'threews';
      console.log(`[3D gen] âœ… three.ws produced GLB`);
    }

    if (!glbUrl) {
      throw new Error('No provider could generate a model.');
    }

    // 4. Download the GLB
    const glbRes = await fetch(glbUrl);
    if (!glbRes.ok) throw new Error(`Failed to download .glb: HTTP ${glbRes.status}`);
    const glbBuffer = Buffer.from(await glbRes.arrayBuffer());
    console.log(`[3D gen] Downloaded ${glbBuffer.length} bytes via ${usedProvider}`);

    // 5. Save + insert DB row
    const filename = `generated-${productId}-${Date.now()}.glb`;
    fs.writeFileSync(path.join(MODELS_DIR, filename), glbBuffer);

    await pool.query(
      `UPDATE product_3d_models SET is_primary = FALSE WHERE product_id = $1`,
      [productId]
    );

    const modelUrl = `/uploads/models/${filename}`;
    const insertRes = await pool.query(
      `INSERT INTO product_3d_models
         (product_id, model_url, format, file_size_bytes, is_primary)
       VALUES ($1, $2, 'glb', $3, TRUE) RETURNING *`,
      [productId, modelUrl, glbBuffer.length]
    );

    console.log(`[3D gen] âœ… Saved: ${modelUrl}`);
    res.status(201).json({
      message: `3D model generated via ${usedProvider}.`,
      provider: usedProvider,
      data: insertRes.rows[0],
    });
  } catch (error) {
    console.error('[3D gen] âŒ', error.message);
    res.status(500).json({ error: error.message || 'Could not generate 3D model.' });
  }
});

// ---------------------------------------------------------------
// Provider helpers
// ---------------------------------------------------------------

async function generateViaNanoGPT(imageLocalPath) {
  const apiKey = process.env.NANOGPT_API_KEY;
  if (!apiKey) throw new Error('NANOGPT_API_KEY is not configured.');

  const buf = fs.readFileSync(imageLocalPath);
  const ext = path.extname(imageLocalPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const imageDataUrl = `data:${mime};base64,${buf.toString('base64')}`;

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
    const body = (await submitRes.text()).slice(0, 400);
    throw new Error(`NanoGPT submit failed: HTTP ${submitRes.status} ${body}`);
  }

  let job = await submitRes.json();
  const runId = job.id || job.runId || job.run_id;
  if (!runId) throw new Error('NanoGPT returned no run ID.');

  // Poll for up to 5 minutes
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    // Try both possible polling hosts â€” one will work
    let pollRes = await fetch(`https://nano-gpt.com/api/generate-video/${runId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (pollRes.status === 404) {
      pollRes = await fetch(`https://api.nano-gpt.com/api/generate-video/${runId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    }
    if (!pollRes.ok) {
      const body = (await pollRes.text()).slice(0, 300);
      throw new Error(`NanoGPT poll failed: HTTP ${pollRes.status} ${body}`);
    }

    job = await pollRes.json();
    const status = job.status || job.state;
    console.log(`[3D gen] NanoGPT poll: ${status}`);

    if (['completed', 'succeeded', 'done'].includes(status)) {
      const glb =
        job.output?.glb || job.output?.url ||
        job.result?.glb || job.glb_url || job.glbUrl;
      if (!glb) throw new Error('NanoGPT finished but returned no GLB URL.');
      return glb;
    }
    if (['failed', 'error'].includes(status)) {
      throw new Error(`NanoGPT generation failed: ${JSON.stringify(job).slice(0, 300)}`);
    }
  }
  throw new Error('NanoGPT generation timed out after 5 minutes.');
}

async function generateViaThreeWS(imageLocalPath, productName) {
  const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (!publicBase) throw new Error('PUBLIC_BASE_URL not configured.');

  // Note: three.ws needs a public URL, not a local file.
  // For this helper we assume the caller already has PUBLIC_BASE_URL set
  // and the local image is mirrored at /uploads/products/<filename>.
  const filename = path.basename(imageLocalPath);
  const publicImageUrl = `${publicBase}/uploads/products/${filename}`;

  const submitRes = await fetch('https://three.ws/api/forge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_urls: [publicImageUrl], tier: 'draft' }),
  });
  if (!submitRes.ok) {
    throw new Error(`three.ws submit failed: HTTP ${submitRes.status}`);
  }
  let job = await submitRes.json();

  for (let i = 0; i < 60; i++) {
    if (['done', 'completed'].includes(job.status) && job.glb_url) return job.glb_url;
    if (job.status === 'failed') throw new Error('three.ws job failed.');
    if (job.glb_url) return job.glb_url;

    const waitMs = (job.retryAfter || 5) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    const pollRes = await fetch(
      `https://three.ws/api/forge?job=${encodeURIComponent(job.job_id)}`
    );
    job = await pollRes.json();
    console.log(`[3D gen] three.ws poll: ${job.status}`);
  }
  throw new Error('three.ws generation timed out.');
}




module.exports = router;