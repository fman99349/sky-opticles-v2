const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { toAbsoluteUrl } = require('../utils/url');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');
const {
  requireShopAccess,
  canAccessShop,
} = require('../middleware/shopAccess');

const router = express.Router();

// --- Product image upload settings ---

const PRODUCT_UPLOAD_DIR = path.join(
  __dirname,
  '..',
  '..',
  'uploads',
  'products'
);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const EXT_BY_IMAGE_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCT_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = EXT_BY_IMAGE_MIME[file.mimetype] || '';
    const rand = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP files are allowed.'));
    }
    cb(null, true);
  },
});

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function handleError(res, error, operation) {
  console.error(`${operation}:`, error.message);

  if (error.code === '23505') {
    return res.status(409).json({
      error: 'A record with this SKU or another unique value already exists.',
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      error: 'The referenced product, variant, or prescription does not exist.',
    });
  }

  if (error.code === '23514' || error.code === '22P02') {
    return res.status(400).json({
      error: 'One or more supplied values are invalid.',
    });
  }

  return res.status(500).json({
    error: 'An unexpected server error occurred.',
  });
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

// Accepts null/undefined (returns null), '' (returns null), or a positive int.
// Rejects anything else. Used by both create-variant and create-image.
function normalizeVariantId(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return 'INVALID';
  return n;
}

// Returns true if the given variant_id belongs to the given product_id.
async function variantBelongsToProduct(client, variantId, productId) {
  if (variantId === null) return true;
  const r = await client.query(
    'SELECT 1 FROM product_variants WHERE id = $1 AND product_id = $2',
    [variantId, productId]
  );
  return r.rows.length > 0;
}

// Simple hex colour validator for #RRGGBB format.
function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

// ---------------------------------------------------------------------------
// Shop-ownership helpers + middleware
// ---------------------------------------------------------------------------
// Every mutation below is chained: requireAdmin â†’ requireShopAccess â†’
// requireProductAccess (or requireVariantAccess). Access checks run BEFORE
// the handler body, so handlers can assume the caller owns the resource.

async function loadProductShopId(productId) {
  const r = await pool.query('SELECT shop_id FROM products WHERE id = $1', [productId]);
  return r.rows[0]?.shop_id ?? null;
}

async function loadVariantParentShopId(variantId) {
  const r = await pool.query(
    `SELECT p.shop_id
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
      WHERE v.id = $1`,
    [variantId]
  );
  return r.rows[0]?.shop_id ?? null;
}

// Verifies the caller can access the product in :productId.
// Returns 404 (not 403) when it exists but belongs to another shop â€” this
// prevents leaking existence of another seller's products.
async function requireProductAccess(req, res, next) {
  const productId = req.params.productId;
  if (!validId(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const shopId = await loadProductShopId(Number(productId));
    if (shopId === null || !canAccessShop(req, shopId)) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    req._shopId = shopId;
    next();
  } catch (err) {
    return handleError(res, err, 'Product access check failed');
  }
}

// Verifies the caller can access the variant in :id.
async function requireVariantAccess(req, res, next) {
  const variantId = req.params.id;
  if (!validId(variantId)) {
    return res.status(400).json({ error: 'Invalid variant ID.' });
  }
  try {
    const shopId = await loadVariantParentShopId(Number(variantId));
    if (shopId === null || !canAccessShop(req, shopId)) {
      return res.status(404).json({ error: 'Variant not found.' });
    }
    req._shopId = shopId;
    req._variantId = Number(variantId);
    next();
  } catch (err) {
    return handleError(res, err, 'Variant access check failed');
  }
}

// ---------------------------------------------------------------------------
// VARIANTS
// ---------------------------------------------------------------------------

// GET /api/products/:productId/variants
router.get('/products/:productId/variants', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const { productId } = req.params;

  if (!validId(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  try {
    const result = await pool.query(
            `SELECT id, product_id, sku, color, color_hex, frame_material,
              frame_shape, size_label, price_override,
              stock_quantity, reorder_level, is_active, attributes, created_at
       FROM product_variants
       WHERE product_id = $1
       ORDER BY id`,
      [Number(productId)]
    );

    res.json({ data: result.rows });
  } catch (error) {
    handleError(res, error, 'List variants failed');
  }
});

// POST /api/products/:productId/variants
router.post('/products/:productId/variants', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const { productId } = req.params;
   const {
    sku,
    color,
    colorHex,
    frameMaterial,
    frameShape,
    sizeLabel,
    priceOverride,
    stockQuantity = 0,
    reorderLevel = 5,
    attributes,
  } = req.body;

  if (!validId(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  if (typeof sku !== 'string' || !sku.trim() || sku.trim().length > 80) {
    return res.status(400).json({
      error: 'SKU is required and must not exceed 80 characters.',
    });
  }

  if (!nonNegativeInteger(stockQuantity) || !nonNegativeInteger(reorderLevel)) {
    return res.status(400).json({
      error: 'Stock quantity and reorder level must be non-negative integers.',
    });
  }

  if (
    colorHex !== undefined &&
    colorHex !== null &&
    colorHex !== '' &&
    !isValidHexColor(colorHex)
  ) {
    return res.status(400).json({
      error: 'colorHex must be a hex colour like #1A1A1A.',
    });
  }

  if (
    attributes !== undefined &&
    attributes !== null &&
    (typeof attributes !== 'object' || Array.isArray(attributes))
  ) {
    return res.status(400).json({
      error: 'attributes must be a plain object (key/value pairs).',
    });
  }







  let parsedPrice = null;

  if (
    priceOverride !== undefined &&
    priceOverride !== null &&
    priceOverride !== ''
  ) {
    parsedPrice = Number(priceOverride);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        error: 'Price override must be a non-negative number.',
      });
    }
  }

  const optionalText = { color, frameMaterial, frameShape, sizeLabel };

  for (const [field, value] of Object.entries(optionalText)) {
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== 'string' || value.length > 100)
    ) {
      return res.status(400).json({
        error: `${field} must be text of at most 100 characters.`,
      });
    }
  }

  const cleanColorHex =
    typeof colorHex === 'string' && colorHex.trim()
      ? colorHex.trim().toUpperCase()
      : null;

  try {
    const result = await pool.query(
           `INSERT INTO product_variants
         (product_id, sku, color, color_hex, frame_material, frame_shape,
          size_label, price_override, stock_quantity, reorder_level, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        Number(productId),
        sku.trim(),
        color?.trim() || null,
        cleanColorHex,
        frameMaterial?.trim() || null,
        frameShape?.trim() || null,
        sizeLabel?.trim() || null,
        parsedPrice,
        stockQuantity,
        reorderLevel,
        attributes && typeof attributes === 'object' && !Array.isArray(attributes)
          ? attributes
          : {},
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Create variant failed');
  }
});
















// PATCH /api/variants/:id/stock
router.patch('/variants/:id/stock', requireAdmin, requireShopAccess, requireVariantAccess, async (req, res) => {
  const { id } = req.params;
  const { stockQuantity } = req.body;

  if (!validId(id)) {
    return res.status(400).json({ error: 'Invalid variant ID.' });
  }

  if (!nonNegativeInteger(stockQuantity)) {
    return res.status(400).json({
      error: 'Stock quantity must be a non-negative integer.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE product_variants
       SET stock_quantity = $1
       WHERE id = $2
       RETURNING id, product_id, sku, stock_quantity, reorder_level`,
      [stockQuantity, Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found.' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Update stock failed');
  }
});

// PATCH /api/variants/:id â€” full edit
router.patch('/variants/:id', requireAdmin, requireShopAccess, requireVariantAccess, async (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    return res.status(400).json({ error: 'Invalid variant ID.' });
  }

   const {
    sku,
    color,
    colorHex,
    frameMaterial,
    frameShape,
    sizeLabel,
    priceOverride,
    stockQuantity,
    reorderLevel,
    isActive,
    attributes,
  } = req.body || {};

  let existing;
  try {
    const r = await pool.query(
      'SELECT id, product_id FROM product_variants WHERE id = $1',
      [Number(id)]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found.' });
    }
    existing = r.rows[0];
  } catch (error) {
    return handleError(res, error, 'Load variant failed');
  }

  const updates = {};
  const values = [];

  if (sku !== undefined) {
    if (typeof sku !== 'string' || !sku.trim() || sku.trim().length > 80) {
      return res.status(400).json({
        error: 'SKU is required and must not exceed 80 characters.',
      });
    }
    updates.sku = sku.trim();
  }

  if (stockQuantity !== undefined) {
    if (!nonNegativeInteger(stockQuantity)) {
      return res.status(400).json({
        error: 'stockQuantity must be a non-negative integer.',
      });
    }
    updates.stock_quantity = stockQuantity;
  }

  if (reorderLevel !== undefined) {
    if (!nonNegativeInteger(reorderLevel)) {
      return res.status(400).json({
        error: 'reorderLevel must be a non-negative integer.',
      });
    }
    updates.reorder_level = reorderLevel;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be true or false.' });
    }
    updates.is_active = isActive;
  }

  if (attributes !== undefined) {
    if (
      attributes === null ||
      typeof attributes !== 'object' ||
      Array.isArray(attributes)
    ) {
      return res.status(400).json({
        error: 'attributes must be a plain object (key/value pairs).',
      });
    }
    updates.attributes = attributes;
  }






  if (priceOverride !== undefined) {
    if (priceOverride === null || priceOverride === '') {
      updates.price_override = null;
    } else {
      const n = Number(priceOverride);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({
          error: 'priceOverride must be a non-negative number or null.',
        });
      }
      updates.price_override = n;
    }
  }

  if (colorHex !== undefined) {
    if (colorHex === null || colorHex === '') {
      updates.color_hex = null;
    } else {
      if (!isValidHexColor(colorHex)) {
        return res.status(400).json({
          error: 'colorHex must be a hex colour like #1A1A1A.',
        });
      }
      updates.color_hex = colorHex.trim().toUpperCase();
    }
  }

  const optionalText = { color, frameMaterial, frameShape, sizeLabel };
  const columnByField = {
    color: 'color',
    frameMaterial: 'frame_material',
    frameShape: 'frame_shape',
    sizeLabel: 'size_label',
  };

  for (const [field, value] of Object.entries(optionalText)) {
    if (value === undefined) continue;
    if (value !== null && (typeof value !== 'string' || value.length > 100)) {
      return res.status(400).json({
        error: `${field} must be text of at most 100 characters.`,
      });
    }
    updates[columnByField[field]] =
      typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const setClauses = [];
  for (const [col, val] of Object.entries(updates)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }
  values.push(Number(id));

  try {
    const result = await pool.query(
      `UPDATE product_variants
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Update variant failed');
  }
});

// DELETE /api/variants/:id
router.delete('/variants/:id', requireAdmin, requireShopAccess, requireVariantAccess, async (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    return res.status(400).json({ error: 'Invalid variant ID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM product_variants WHERE id = $1
       RETURNING id, product_id, sku`,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found.' });
    }

    res.json({
      data: {
        id: result.rows[0].id,
        product_id: result.rows[0].product_id,
        sku: result.rows[0].sku,
        deleted: true,
      },
    });
  } catch (error) {
    handleError(res, error, 'Delete variant failed');
  }
});

// ---------------------------------------------------------------------------
// IMAGES
// ---------------------------------------------------------------------------

// GET /api/products/:productId/images
router.get('/products/:productId/images', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const { productId } = req.params;

  if (!validId(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  try {
    const result = await pool.query(
            `SELECT id, product_id, image_url, alt_text,
              is_primary, sort_order, variant_id, lens_layer_url, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [Number(productId)]
    );

       const rows = result.rows.map((row) => ({
      ...row,
      image_url: toAbsoluteUrl(req, row.image_url),
      lens_layer_url: toAbsoluteUrl(req, row.lens_layer_url),
    }));

    res.json({ data: rows });
  } catch (error) {
    handleError(res, error, 'List images failed');
  }
});

// POST /api/products/:productId/images â€” create by URL
router.post('/products/:productId/images', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const { productId } = req.params;
    const {
    imageUrl,
    altText = null,
    isPrimary = false,
    sortOrder = 0,
    variantId = null,
    lensLayerUrl = null,
  } = req.body;

  if (!validId(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  if (
    lensLayerUrl !== null &&
    lensLayerUrl !== '' &&
    (typeof lensLayerUrl !== 'string' ||
      !/^https?:\/\/\S+$/i.test(lensLayerUrl.trim()))
  ) {
    return res.status(400).json({
      error: 'lensLayerUrl must be a valid HTTP or HTTPS URL or null.',
    });
  }

  if (altText !== null && (typeof altText !== 'string' || altText.length > 250)) {
    return res.status(400).json({ error: 'Invalid altText.' });
  }

  if (typeof isPrimary !== 'boolean') {
    return res.status(400).json({ error: 'isPrimary must be true or false.' });
  }

  if (!nonNegativeInteger(sortOrder)) {
    return res.status(400).json({
      error: 'sortOrder must be a non-negative integer.',
    });
  }

  const normalizedVariantId = normalizeVariantId(variantId);
  if (normalizedVariantId === 'INVALID') {
    return res.status(400).json({ error: 'Invalid variantId.' });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    if (
      !(await variantBelongsToProduct(
        client,
        normalizedVariantId,
        Number(productId)
      ))
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res
        .status(400)
        .json({ error: 'variantId does not belong to this product.' });
    }

    if (isPrimary) {
      await client.query(
        `UPDATE product_images
         SET is_primary = FALSE
         WHERE product_id = $1 AND is_primary = TRUE`,
        [Number(productId)]
      );
    }

    const result = await client.query(
            `INSERT INTO product_images
         (product_id, image_url, alt_text, is_primary, sort_order, variant_id, lens_layer_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        Number(productId),
        imageUrl.trim(),
        altText?.trim() || null,
        isPrimary,
        sortOrder,
        normalizedVariantId,
        typeof lensLayerUrl === 'string' && lensLayerUrl.trim()
          ? lensLayerUrl.trim()
          : null,
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => {});
    }
    handleError(res, error, 'Create image failed');
  } finally {
    client.release();
  }
});













// POST /api/products/:productId/images/upload â€” create by file
router.post('/products/:productId/images/upload', requireAdmin, requireShopAccess, requireProductAccess, (req, res) => {
  const { productId } = req.params;

  if (!validId(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

    imageUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'lensLayer', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File exceeds the 5 MB limit.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }

        const mainFile = req.files?.file?.[0];
    const lensLayerFile = req.files?.lensLayer?.[0];

    if (!mainFile) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const rawAlt = req.body?.altText;
    const rawPrimary = req.body?.isPrimary;
    const rawSort = req.body?.sortOrder;
    const rawVariant = req.body?.variantId;

    const altText =
      typeof rawAlt === 'string' && rawAlt.trim() ? rawAlt.trim() : null;
    const isPrimary = rawPrimary === 'true' || rawPrimary === true;
    const sortOrder =
      rawSort !== undefined && rawSort !== '' ? Number(rawSort) : 0;

        if (altText !== null && altText.length > 250) {
      try {
        fs.unlinkSync(mainFile.path);
      } catch {}
      if (lensLayerFile) {
        try {
          fs.unlinkSync(lensLayerFile.path);
        } catch {}
      }
      return res.status(400).json({ error: 'altText is too long.' });
    }

        if (!nonNegativeInteger(sortOrder)) {
      try {
        fs.unlinkSync(mainFile.path);
      } catch {}
      if (lensLayerFile) {
        try {
          fs.unlinkSync(lensLayerFile.path);
        } catch {}
      }
      return res
        .status(400)
        .json({ error: 'sortOrder must be a non-negative integer.' });
    }

        const normalizedVariantId = normalizeVariantId(rawVariant);
    if (normalizedVariantId === 'INVALID') {
      try {
        fs.unlinkSync(mainFile.path);
      } catch {}
      if (lensLayerFile) {
        try {
          fs.unlinkSync(lensLayerFile.path);
        } catch {}
      }
      return res.status(400).json({ error: 'Invalid variantId.' });
    }

        const storedPath = `/uploads/products/${mainFile.filename}`;
    const storedLensLayerPath = lensLayerFile
      ? `/uploads/products/${lensLayerFile.filename}`
      : null;

    const client = await pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

            if (
        !(await variantBelongsToProduct(
          client,
          normalizedVariantId,
          Number(productId)
        ))
      ) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        try {
          fs.unlinkSync(mainFile.path);
        } catch {}
        if (lensLayerFile) {
          try {
            fs.unlinkSync(lensLayerFile.path);
          } catch {}
        }
        return res
          .status(400)
          .json({ error: 'variantId does not belong to this product.' });
      } 

      if (isPrimary) {
        await client.query(
          `UPDATE product_images
           SET is_primary = FALSE
           WHERE product_id = $1 AND is_primary = TRUE`,
          [Number(productId)]
        );
      }

            const result = await client.query(
        `INSERT INTO product_images
           (product_id, image_url, alt_text, is_primary, sort_order, variant_id, lens_layer_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          Number(productId),
          storedPath,
          altText,
          isPrimary,
          sortOrder,
          normalizedVariantId,
          storedLensLayerPath,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

           res.status(201).json({
        data: {
          ...result.rows[0],
          image_url: toAbsoluteUrl(req, result.rows[0].image_url),
          lens_layer_url: toAbsoluteUrl(req, result.rows[0].lens_layer_url),
        },
      });
        } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK').catch(() => {});
      }
      try {
        fs.unlinkSync(mainFile.path);
      } catch {}
      if (lensLayerFile) {
        try {
          fs.unlinkSync(lensLayerFile.path);
        } catch {}
      }
      handleError(res, error, 'Image upload insert failed');
    } finally {
      client.release();
    }
  });
});

// PATCH /api/products/:productId/images/:imageId
router.patch('/products/:productId/images/:imageId', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const { productId, imageId } = req.params;

  if (!validId(productId) || !validId(imageId)) {
    return res.status(400).json({ error: 'Invalid product or image ID.' });
  }

    const { is_primary, alt_text, sort_order, variant_id, lens_layer_url } =
    req.body || {};

   if (
    is_primary === undefined &&
    alt_text === undefined &&
    sort_order === undefined &&
    variant_id === undefined &&
    lens_layer_url === undefined
  ) {
    return res.status(400).json({
      error:
        'Provide at least one of: is_primary, alt_text, sort_order, variant_id, lens_layer_url.',
    });
  }


  if (
    lens_layer_url !== undefined &&
    lens_layer_url !== null &&
    lens_layer_url !== '' &&
    (typeof lens_layer_url !== 'string' ||
      !/^https?:\/\/\S+$/i.test(lens_layer_url.trim()))
  ) {
    return res.status(400).json({
      error: 'lens_layer_url must be a valid HTTP or HTTPS URL or null.',
    });
  }














  if (is_primary !== undefined && typeof is_primary !== 'boolean') {
    return res.status(400).json({ error: 'is_primary must be true or false.' });
  }

  if (
    alt_text !== undefined &&
    alt_text !== null &&
    (typeof alt_text !== 'string' || alt_text.length > 250)
  ) {
    return res
      .status(400)
      .json({ error: 'alt_text must be at most 250 characters.' });
  }

  if (sort_order !== undefined && !nonNegativeInteger(sort_order)) {
    return res
      .status(400)
      .json({ error: 'sort_order must be a non-negative integer.' });
  }

  let normalizedVariantId = null;
  if (variant_id !== undefined) {
    normalizedVariantId = normalizeVariantId(variant_id);
    if (normalizedVariantId === 'INVALID') {
      return res.status(400).json({ error: 'Invalid variant_id.' });
    }
  }

  const client = await pool.connect();
  let tx = false;

  try {
    await client.query('BEGIN');
    tx = true;

    const existing = await client.query(
      'SELECT id FROM product_images WHERE id = $1 AND product_id = $2',
      [Number(imageId), Number(productId)]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      tx = false;
      return res
        .status(404)
        .json({ error: 'Image not found for this product.' });
    }





    if (
      variant_id !== undefined &&
      !(await variantBelongsToProduct(
        client,
        normalizedVariantId,
        Number(productId)
      ))
    ) {
      await client.query('ROLLBACK');
      tx = false;
      return res
        .status(400)
        .json({ error: 'variant_id does not belong to this product.' });
    }

    if (is_primary === true) {
      await client.query(
        `UPDATE product_images
         SET is_primary = FALSE
         WHERE product_id = $1 AND is_primary = TRUE`,
        [Number(productId)]
      );
    }

    const updates = [];
    const values = [];

    if (is_primary !== undefined) {
      values.push(is_primary);
      updates.push(`is_primary = $${values.length}`);
    }
    if (alt_text !== undefined) {
      values.push(alt_text);
      updates.push(`alt_text = $${values.length}`);
    }
    if (sort_order !== undefined) {
      values.push(sort_order);
      updates.push(`sort_order = $${values.length}`);
    }
        if (variant_id !== undefined) {
      values.push(normalizedVariantId);
      updates.push(`variant_id = $${values.length}`);
    }
    if (lens_layer_url !== undefined) {
      values.push(
        lens_layer_url === null || lens_layer_url === ''
          ? null
          : lens_layer_url.trim()
      );
      updates.push(`lens_layer_url = $${values.length}`);
    }

    

    values.push(Number(imageId));
    values.push(Number(productId));

    const result = await client.query(
      `UPDATE product_images
       SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND product_id = $${values.length}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');
    tx = false;

        res.json({
      data: {
        ...result.rows[0],
        image_url: toAbsoluteUrl(req, result.rows[0].image_url),
        lens_layer_url: toAbsoluteUrl(req, result.rows[0].lens_layer_url),
      },
    });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    handleError(res, error, 'Update image failed');
  } finally {
    client.release();
  }
});

// DELETE /api/products/:productId/images/:imageId
router.delete('/products/:productId/images/:imageId', requireAdmin, requireShopAccess, requireProductAccess, async (req, res) => {
  const { productId, imageId } = req.params;

  if (!validId(productId) || !validId(imageId)) {
    return res.status(400).json({ error: 'Invalid product or image ID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM product_images
       WHERE id = $1 AND product_id = $2
       RETURNING id, image_url`,
      [Number(imageId), Number(productId)]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Image not found for this product.' });
    }

    const storedPath = result.rows[0].image_url;

    if (
      typeof storedPath === 'string' &&
      storedPath.startsWith('/uploads/products/')
    ) {
      const filename = storedPath.replace('/uploads/products/', '');
      const filePath = path.join(PRODUCT_UPLOAD_DIR, filename);
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    res.json({ data: { id: result.rows[0].id, deleted: true } });
  } catch (error) {
    handleError(res, error, 'Delete image failed');
  }
});



// POST /api/products/:productId/images/:imageId/lens-layer
// Attach a lens-mask PNG to an existing image. The mask is a transparent
// PNG the same size as the image, with the lens area drawn in white.
// The file is saved next to the image and the image row's
// lens_layer_url is updated. Any previous lens layer file is unlinked.
router.post('/products/:productId/images/:imageId/lens-layer', requireAdmin, requireShopAccess, requireProductAccess, (req, res) => {
    const { productId, imageId } = req.params;

    if (!validId(productId) || !validId(imageId)) {
      return res.status(400).json({ error: 'Invalid product or image ID.' });
    }

    imageUpload.single('lensLayer')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File exceeds the 5 MB limit.' });
        }
        return res.status(400).json({ error: err.message || 'Upload failed.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No lens layer uploaded.' });
      }

      const uploadedPath = `/uploads/products/${req.file.filename}`;
      let previousPath = null;

      try {
        const existing = await pool.query(
          'SELECT lens_layer_url FROM product_images WHERE id = $1 AND product_id = $2',
          [Number(imageId), Number(productId)]
        );
        if (existing.rows.length === 0) {
          try { fs.unlinkSync(req.file.path); } catch {}
          return res
            .status(404)
            .json({ error: 'Image not found for this product.' });
        }
        previousPath = existing.rows[0].lens_layer_url;

        const result = await pool.query(
          `UPDATE product_images
           SET lens_layer_url = $1
           WHERE id = $2 AND product_id = $3
           RETURNING *`,
          [uploadedPath, Number(imageId), Number(productId)]
        );

        // Best-effort cleanup of the previous lens layer file.
        if (
          typeof previousPath === 'string' &&
          previousPath.startsWith('/uploads/products/')
        ) {
          const filename = previousPath.replace('/uploads/products/', '');
          const filePath = path.join(PRODUCT_UPLOAD_DIR, filename);
          try { fs.unlinkSync(filePath); } catch {}
        }

        res.status(201).json({
          data: {
            ...result.rows[0],
            image_url: toAbsoluteUrl(req, result.rows[0].image_url),
            lens_layer_url: toAbsoluteUrl(req, result.rows[0].lens_layer_url),
          },
        });
      } catch (error) {
        try { fs.unlinkSync(req.file.path); } catch {}
        handleError(res, error, 'Attach lens layer failed');
      }
    });
  }
);











module.exports = router;