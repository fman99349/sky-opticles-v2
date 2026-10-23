const express = require('express');
const { toAbsoluteUrl } = require('../utils/url');
const pool = require('../db');

const router = express.Router();


// Helper: Fetch exchange rate for a given currency
async function getExchangeRate(client, currency) {
  if (!currency || currency === 'ZAR') return 1;
  const res = await client.query('SELECT rate_to_base FROM exchange_rates WHERE currency_code = $1', [currency]);
  return res.rows.length > 0 ? Number(res.rows[0].rate_to_base) : 1;
}




function makeSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function handleError(res, error, operation) {
  console.error(`${operation}:`, error.message);

  if (error.code === '23505') {
    return res.status(409).json({
      error: 'A record with this name or slug already exists.',
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      error: 'The referenced category, brand or product does not exist.',
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

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, is_active, parent_id, created_at
      FROM categories
      WHERE is_active = TRUE
      ORDER BY id ASC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    handleError(res, error, 'List categories failed');
  }
});

// POST /api/categories
router.post('/categories', async (req, res) => {
  const { name, description, parentId } = req.body;

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({
      error: 'Name is required and must not exceed 100 characters.',
    });
  }

  const slug = makeSlug(name);

  if (!slug) {
    return res.status(400).json({
      error: 'Name must contain letters or numbers.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, description, is_active, parent_id, created_at`,
      [
        name.trim(),
        slug,
        typeof description === 'string' ? description.trim() || null : null,
        parentId ? Number(parentId) : null,
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Create category failed');
  }
});

// GET /api/brands
router.get('/brands', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, is_active, created_at
      FROM brands
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    handleError(res, error, 'List brands failed');
  }
});

// POST /api/brands
router.post('/brands', async (req, res) => {
  const { name } = req.body;

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({
      error: 'Name is required and must not exceed 120 characters.',
    });
  }

  const slug = makeSlug(name);

  if (!slug) {
    return res.status(400).json({
      error: 'Name must contain letters or numbers.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO brands (name, slug)
       VALUES ($1, $2)
       RETURNING id, name, slug, is_active, created_at`,
      [name.trim(), slug]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Create brand failed');
  }
});

// GET /api/products
// Optional filters: search, categoryId, brandId, type, page, limit
router.get('/products', async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  if (
    !Number.isInteger(page) || page < 1 ||
    !Number.isInteger(limit) || limit < 1 || limit > 100
  ) {
    return res.status(400).json({
      error: 'Page must be positive; limit must be between 1 and 100.',
    });
  }

  const conditions = ["p.status = 'active'"];
  const values = [];

  function addFilter(sql, value) {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  }

  if (req.query.search !== undefined) {
    if (typeof req.query.search !== 'string' || req.query.search.length > 100) {
      return res.status(400).json({
        error: 'Search must not exceed 100 characters.',
      });
    }

    addFilter(
      "(p.name ILIKE ? OR COALESCE(p.description, '') ILIKE ?)",
      `%${req.query.search}%`
    );

    // The two placeholders in this filter must use the same parameter.
    conditions[conditions.length - 1] =
      `(p.name ILIKE $${values.length} OR COALESCE(p.description, '') ILIKE $${values.length})`;
  }

  if (req.query.categoryId !== undefined) {
    if (!isPositiveInteger(req.query.categoryId)) {
      return res.status(400).json({ error: 'Invalid categoryId.' });
    }
    addFilter('p.category_id = ?', Number(req.query.categoryId));
  }

  if (req.query.brandId !== undefined) {
    if (!isPositiveInteger(req.query.brandId)) {
      return res.status(400).json({ error: 'Invalid brandId.' });
    }
    addFilter('p.brand_id = ?', Number(req.query.brandId));
  }

  if (req.query.type !== undefined) {
    if (typeof req.query.type !== 'string' || !req.query.type.trim()) {
      return res.status(400).json({ error: 'type must be a non-empty string.' });
    }
    addFilter('p.product_type = ?', req.query.type.trim());
  }



    if (req.query.condition !== undefined) {
    if (!['new', 'used'].includes(req.query.condition)) {
      return res.status(400).json({ error: 'condition must be new or used.' });
    }
    addFilter('p.condition = ?', req.query.condition);
  }

  if (req.query.parentCategoryId !== undefined) {
    if (!isPositiveInteger(req.query.parentCategoryId)) {
      return res.status(400).json({ error: 'Invalid parentCategoryId.' });
    }
    values.push(Number(req.query.parentCategoryId));
    conditions.push(`c.parent_id = $${values.length}`);
  }
  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const currency = req.query.currency || 'ZAR';
  const rate = await getExchangeRate(pool, currency);

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM products p
       WHERE ${whereClause}`,
      values
    );

   

        const listValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.slug,
         p.description,
         p.product_type,
         COALESCE(pcp.price, p.price * ${rate})::numeric(12,2) AS price,
         p.status,
         p.has_configurator,
         p.condition,
         p.created_at,
         c.id AS category_id,
         c.name AS category_name,
         b.id AS brand_id,
         b.name AS brand_name,
         (
           SELECT pi.image_url
           FROM product_images pi
           WHERE pi.product_id = p.id
             AND pi.is_primary = TRUE
           LIMIT 1
         ) AS primary_image
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN product_currency_prices pcp ON pcp.product_id = p.id AND pcp.currency_code = $${listValues.length + 1}
       WHERE ${whereClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      [...listValues, currency]
    );

    // Convert stored relative paths (/uploads/products/...) to absolute
    // URLs the mobile and admin apps can actually load.
    const rows = result.rows.map((row) => ({
      ...row,
      primary_image: toAbsoluteUrl(req, row.primary_image),
    }));

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    handleError(res, error, 'List products failed');
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  const currency = req.query.currency || 'ZAR';
  const rate = await getExchangeRate(pool, currency);

  try {
    const productResult = await pool.query(
      `SELECT
         p.*,
         COALESCE(pcp.price, p.price * ${rate})::numeric(12,2) AS price,
         c.name AS category_name,
         b.name AS brand_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN product_currency_prices pcp ON pcp.product_id = p.id AND pcp.currency_code = $2
       WHERE p.id = $1`,
      [Number(req.params.id), currency]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const [variantsResult, imagesResult, modelsResult] = await Promise.all([
            pool.query(
        `SELECT id, sku, color, color_hex, frame_material, frame_shape,
                size_label, 
                CASE WHEN price_override IS NOT NULL THEN (price_override * ${rate})::numeric(12,2) ELSE NULL END AS price_override,
                stock_quantity, reorder_level, is_active, attributes
         FROM product_variants
         WHERE product_id = $1
         ORDER BY id`,
        [Number(req.params.id)]
      ),
               pool.query(
        `SELECT id, image_url, alt_text, is_primary, sort_order, variant_id, lens_layer_url
         FROM product_images
         WHERE product_id = $1
               ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [Number(req.params.id)]
    ),
    pool.query(
      `SELECT id, variant_id, model_url, format, poster_url, file_size_bytes, is_primary
       FROM product_3d_models
       WHERE product_id = $1
       ORDER BY is_primary DESC, variant_id NULLS FIRST, id ASC`,
      [Number(req.params.id)]
    ),
  ]);

    const product = productResult.rows[0];

        const images = imagesResult.rows.map((img) => ({
      ...img,
      image_url: toAbsoluteUrl(req, img.image_url),
      lens_layer_url: toAbsoluteUrl(req, img.lens_layer_url),
    }));

    const primary = images.find((img) => img.is_primary);

    res.json({
  data: {
    ...product,
    primary_image: toAbsoluteUrl(req, primary ? primary.image_url : null),
    variants: variantsResult.rows,
    images,
    models_3d: modelsResult.rows.map((m) => ({
      ...m,
      model_url: toAbsoluteUrl(req, m.model_url),
    })),
  },
});





  } catch (error) {
    handleError(res, error, 'Get product failed');
  }
});























// POST /api/products
router.post('/products', async (req, res) => {
    const {
    name,
    categoryId,
    brandId,
    description,
    productType,
    price,
    status,
    hasConfigurator,
    condition = 'new',
  } = req.body;

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) {
    return res.status(400).json({
      error: 'Name is required and must not exceed 200 characters.',
    });
  }

  if (!isPositiveInteger(categoryId)) {
    return res.status(400).json({ error: 'A valid categoryId is required.' });
  }

  if (
    brandId !== undefined &&
    brandId !== null &&
    brandId !== '' &&
    !isPositiveInteger(brandId)
  ) {
    return res.status(400).json({ error: 'Invalid brandId.' });
  }

    if (
    typeof productType !== 'string' ||
    !productType.trim() ||
    productType.trim().length > 50
  ) {
    return res.status(400).json({
      error: 'productType must be a non-empty string of at most 50 characters.',
    });
  }

  if (hasConfigurator !== undefined && typeof hasConfigurator !== 'boolean') {
    return res.status(400).json({
      error: 'hasConfigurator must be true or false.',
    });
  }

  if (!['new', 'used'].includes(condition)) {
    return res.status(400).json({ error: 'condition must be new or used.' });
  }




  if (
    price === undefined ||
    price === null ||
    price === '' ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return res.status(400).json({
      error: 'Price must be a valid non-negative number.',
    });
  }

  const productStatus = status || 'draft';

  if (!['draft', 'active', 'archived'].includes(productStatus)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const slug = makeSlug(name);

  if (!slug) {
    return res.status(400).json({
      error: 'Name must contain letters or numbers.',
    });
  }

  try {
        const result = await pool.query(
      `INSERT INTO products
         (category_id, brand_id, name, slug, description,
          product_type, price, status, has_configurator, condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        Number(categoryId),
        brandId ? Number(brandId) : null,
        name.trim(),
        slug,
        typeof description === 'string' ? description.trim() || null : null,
        productType.trim(),
        Number(price),
        productStatus,
        hasConfigurator === undefined ? true : hasConfigurator,
        condition,
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Create product failed');
  }
});



// ---------------------------------------------------------------------------
// PATCH /api/products/:id
// Update any of: name, description, price, categoryId, brandId, productType,
// status. Slug is regenerated if the name changes. Validation mirrors the
// POST handler so the two stay consistent.
// ---------------------------------------------------------------------------
router.patch('/products/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

   const {
    name,
    categoryId,
    brandId,
    description,
    productType,
    price,
    status,
    hasConfigurator,
    condition,
  } = req.body;

  // Load the existing product so we know the current name before deciding
  // whether to regenerate the slug.
  let existing;
  try {
    const r = await pool.query('SELECT * FROM products WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    existing = r.rows[0];
  } catch (error) {
    return handleError(res, error, 'Load product failed');
  }

  // Validate only the fields that were provided. Undefined fields are left
  // untouched.
  const updates = {};
  const values = [];

   if (productType !== undefined) {
    if (
      typeof productType !== 'string' ||
      !productType.trim() ||
      productType.trim().length > 50
    ) {
      return res.status(400).json({
        error: 'productType must be a non-empty string of at most 50 characters.',
      });
    }
    updates.product_type = productType.trim();
  }

  if (hasConfigurator !== undefined) {
    if (typeof hasConfigurator !== 'boolean') {
      return res.status(400).json({
        error: 'hasConfigurator must be true or false.',
      });
    }
    updates.has_configurator = hasConfigurator;
  }

    if (condition !== undefined) {
    if (!['new', 'used'].includes(condition)) {
      return res.status(400).json({ error: 'condition must be new or used.' });
    }
    updates.condition = condition;
  }
  if (categoryId !== undefined) {
    if (!isPositiveInteger(categoryId)) {
      return res.status(400).json({ error: 'Invalid categoryId.' });
    }
    updates.category_id = Number(categoryId);
  }

  if (brandId !== undefined) {
    if (brandId !== null && brandId !== '' && !isPositiveInteger(brandId)) {
      return res.status(400).json({ error: 'Invalid brandId.' });
    }
    updates.brand_id = brandId ? Number(brandId) : null;
  }

  if (description !== undefined) {
    if (
      description !== null &&
      (typeof description !== 'string' || description.length > 5000)
    ) {
      return res.status(400).json({ error: 'Invalid description.' });
    }
    updates.description =
      typeof description === 'string' && description.trim()
        ? description.trim()
        : null;
  }



  if (price !== undefined) {
    if (
      price === null ||
      price === '' ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        error: 'Price must be a valid non-negative number.',
      });
    }
    updates.price = Number(price);
  }

  if (status !== undefined) {
    if (!['draft', 'active', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  // Regenerate the slug if the name actually changed.
  if (updates.name && updates.name !== existing.name) {
    const nextSlug = makeSlug(updates.name);
    if (!nextSlug) {
      return res.status(400).json({
        error: 'Name must contain letters or numbers.',
      });
    }
    updates.slug = nextSlug;
  }

  const setClauses = [];
  for (const [col, val] of Object.entries(updates)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }
  // updated_at exists on products; bump it. (No trigger does this today.)
  setClauses.push('updated_at = NOW()');

  values.push(Number(req.params.id));

  try {
    const result = await pool.query(
      `UPDATE products
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Update product failed');
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/products/:id
// Deletes the product and its variants (variants FK is RESTRICT, so we must
// remove them first). Images cascade automatically, but their files on disk
// do not — we clean those up after commit.
// ---------------------------------------------------------------------------
router.delete('/products/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  const productId = Number(req.params.id);

  const client = await pool.connect();
  let tx = false;
  let imageUrlsToUnlink = [];

  try {
    await client.query('BEGIN');
    tx = true;

    // Snapshot image URLs so we can delete the files after commit.
    const imgRes = await client.query(
      'SELECT image_url FROM product_images WHERE product_id = $1',
      [productId]
    );
    imageUrlsToUnlink = imgRes.rows
      .map((r) => r.image_url)
      .filter(
        (u) => typeof u === 'string' && u.startsWith('/uploads/products/')
      );

    // Variants have ON DELETE RESTRICT — delete them explicitly first.
    await client.query(
      'DELETE FROM product_variants WHERE product_id = $1',
      [productId]
    );

    // Images cascade with the product, but delete explicitly anyway so the
    // intent is visible in the code.
    await client.query(
      'DELETE FROM product_images WHERE product_id = $1',
      [productId]
    );

    const del = await client.query(
      'DELETE FROM products WHERE id = $1 RETURNING id, name',
      [productId]
    );

    if (del.rows.length === 0) {
      await client.query('ROLLBACK');
      tx = false;
      return res.status(404).json({ error: 'Product not found.' });
    }

    await client.query('COMMIT');
    tx = false;

    // Best-effort disk cleanup. Files outside uploads/products (external URLs)
    // are left untouched.
    const path = require('path');
    const fs = require('fs');
    const uploadsDir = path.join(
      __dirname,
      '..',
      '..',
      'uploads',
      'products'
    );
    for (const url of imageUrlsToUnlink) {
      const filename = url.replace('/uploads/products/', '');
      try {
        fs.unlinkSync(path.join(uploadsDir, filename));
      } catch {
        /* best-effort */
      }
    }

    res.json({ data: { id: del.rows[0].id, name: del.rows[0].name, deleted: true } });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    handleError(res, error, 'Delete product failed');
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/categories/:id
// Update name, description, or is_active. Slug regenerates if name changes.
// ---------------------------------------------------------------------------
router.patch('/categories/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }

  const { name, description, isActive, parentId } = req.body || {};

  let existing;
  try {
    const r = await pool.query('SELECT * FROM categories WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    existing = r.rows[0];
  } catch (error) {
    return handleError(res, error, 'Load category failed');
  }

  const updates = {};
  const values = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be 1–100 chars.' });
    }
    updates.name = name.trim();
  }

  if (description !== undefined) {
    if (
      description !== null &&
      (typeof description !== 'string' || description.length > 5000)
    ) {
      return res.status(400).json({ error: 'Invalid description.' });
    }
    updates.description =
      typeof description === 'string' && description.trim()
        ? description.trim()
        : null;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'isActive must be true or false.' });
    }
    updates.is_active = isActive;
  }
  if (parentId !== undefined) {
    updates.parent_id = parentId ? Number(parentId) : null;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  if (updates.name && updates.name !== existing.name) {
    const nextSlug = makeSlug(updates.name);
    if (!nextSlug) {
      return res
        .status(400)
        .json({ error: 'Name must contain letters or numbers.' });
    }
    updates.slug = nextSlug;
  }

  const setClauses = [];
  for (const [col, val] of Object.entries(updates)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }
  values.push(Number(req.params.id));

  try {
    const result = await pool.query(
      `UPDATE categories SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    res.json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Update category failed');
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/categories/:id
// Fails with 409 if any product still references this category.
// ---------------------------------------------------------------------------
router.delete('/categories/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING id, name',
      [Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json({ data: { ...result.rows[0], deleted: true } });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        error:
          'Cannot delete this category — it is still used by one or more products. Deactivate it instead.',
      });
    }
    handleError(res, error, 'Delete category failed');
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/brands/:id
// Update name or is_active. Slug regenerates if name changes.
// ---------------------------------------------------------------------------
router.patch('/brands/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid brand ID.' });
  }

  const { name, isActive } = req.body || {};

  let existing;
  try {
    const r = await pool.query('SELECT * FROM brands WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found.' });
    }
    existing = r.rows[0];
  } catch (error) {
    return handleError(res, error, 'Load brand failed');
  }

  const updates = {};
  const values = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return res.status(400).json({ error: 'Name must be 1–120 chars.' });
    }
    updates.name = name.trim();
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'isActive must be true or false.' });
    }
    updates.is_active = isActive;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  if (updates.name && updates.name !== existing.name) {
    const nextSlug = makeSlug(updates.name);
    if (!nextSlug) {
      return res
        .status(400)
        .json({ error: 'Name must contain letters or numbers.' });
    }
    updates.slug = nextSlug;
  }

  const setClauses = [];
  for (const [col, val] of Object.entries(updates)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }
  values.push(Number(req.params.id));

  try {
    const result = await pool.query(
      `UPDATE brands SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    res.json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Update brand failed');
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/brands/:id
// Fails with 409 if any product still references this brand.
// ---------------------------------------------------------------------------
router.delete('/brands/:id', async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: 'Invalid brand ID.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM brands WHERE id = $1 RETURNING id, name',
      [Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found.' });
    }
    res.json({ data: { ...result.rows[0], deleted: true } });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        error:
          'Cannot delete this brand — it is still used by one or more products. Deactivate it instead.',
      });
    }
    handleError(res, error, 'Delete brand failed');
  }
});



















module.exports = router;