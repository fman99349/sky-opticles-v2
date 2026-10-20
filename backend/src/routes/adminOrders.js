// Admin-facing order management endpoints.
//
// GET    /api/admin/orders                        — list with filters
// GET    /api/admin/orders/:id                    — one order with items
// PATCH  /api/admin/orders/:id                    — update fulfillment / archived
// DELETE /api/admin/orders/:id                    — soft-delete
// POST   /api/admin/orders/:id/mark-paid          — TEST MODE ONLY
// GET    /api/admin/prescriptions/:id             — stream a prescription file
//
// All endpoints require an admin JWT. Customer tokens are rejected by the
// requireAdmin middleware from adminAuth.js.
//
// Design note on payment_status: per project decisions, the admin normally
// CANNOT set payment_status — the payment gateway does that when it lands.
// The `mark-paid` endpoint below is a temporary test-mode override so we can
// verify the full order lifecycle before the gateway exists. It should be
// removed when real payment processing is wired in.

const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');
const { sendExpoPush } = require('../utils/expoPush');

const router = express.Router();

const PRESCRIPTION_UPLOAD_DIR = path.join(
  __dirname,
  '..',
  '..',
  'uploads',
  'prescriptions'
);

const ALLOWED_PAYMENT = ['unpaid', 'paid', 'refunded'];
const ALLOWED_FULFILLMENT = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

// ---------------------------------------------------------------------------
// GET /api/admin/orders
// Query: payment_status, fulfillment_status, archived, search, page, limit
// ---------------------------------------------------------------------------
router.get('/admin/orders', requireAdmin, async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 25);

  if (
    !Number.isInteger(page) || page < 1 ||
    !Number.isInteger(limit) || limit < 1 || limit > 100
  ) {
    return res.status(400).json({
      error: 'Page must be positive; limit must be between 1 and 100.',
    });
  }

  const conditions = ['o.deleted_at IS NULL'];
  const values = [];

  if (req.query.payment_status !== undefined) {
    if (!ALLOWED_PAYMENT.includes(req.query.payment_status)) {
      return res.status(400).json({ error: 'Invalid payment_status.' });
    }
    values.push(req.query.payment_status);
    conditions.push(`o.payment_status = $${values.length}`);
  }

  if (req.query.fulfillment_status !== undefined) {
    if (!ALLOWED_FULFILLMENT.includes(req.query.fulfillment_status)) {
      return res.status(400).json({ error: 'Invalid fulfillment_status.' });
    }
    values.push(req.query.fulfillment_status);
    conditions.push(`o.fulfillment_status = $${values.length}`);
  }

  if (req.query.archived !== undefined) {
    const archived = req.query.archived === 'true' || req.query.archived === true;
    values.push(archived);
    conditions.push(`o.archived = $${values.length}`);
  }

  if (req.query.search !== undefined) {
    if (
      typeof req.query.search !== 'string' ||
      req.query.search.length > 100
    ) {
      return res.status(400).json({
        error: 'Search must be 100 characters or fewer.',
      });
    }
    values.push(`%${req.query.search}%`);
    const n = values.length;
    conditions.push(
      `(o.order_number ILIKE $${n} OR o.customer_name ILIKE $${n} OR o.customer_email ILIKE $${n})`
    );
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM orders o WHERE ${whereClause}`,
      values
    );

    const listValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT
         o.id,
         o.order_number,
         o.customer_name,
         o.customer_email,
         o.customer_phone,
         o.subtotal,
         o.shipping_cost,
         o.total,
         o.payment_status,
         o.fulfillment_status,
         o.archived,
         o.created_at,
         (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       WHERE ${whereClause}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error('Admin list orders failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/orders/:id — one order with items
// ---------------------------------------------------------------------------
router.get('/admin/orders/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  try {
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT
         oi.id,
         oi.product_id,
         oi.variant_id,
         oi.prescription_id,
         oi.product_name,
         oi.product_slug,
         oi.variant_sku,
         oi.variant_attributes,
         oi.lens_config,
         oi.base_price,
         oi.lens_delta,
         oi.unit_price,
         oi.quantity,
         oi.line_total,
         pr.original_name AS prescription_original_name,
         pr.mime_type     AS prescription_mime_type,
         pr.size_bytes    AS prescription_size_bytes
       FROM order_items oi
       LEFT JOIN prescriptions pr ON pr.id = oi.prescription_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [id]
    );

    res.json({
      data: {
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        },
        shipping: {
          line1: order.shipping_line1,
          line2: order.shipping_line2,
          city: order.shipping_city,
          postalCode: order.shipping_postal_code,
          province: order.shipping_province,
          country: order.shipping_country,
        },
        subtotal: order.subtotal,
        shipping_cost: order.shipping_cost,
        total: order.total,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        archived: order.archived,
        deleted_at: order.deleted_at,
        paid_at: order.paid_at,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Admin get order failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/orders/:id
// Body: { fulfillment_status?, archived? }
//
// Note: payment_status is intentionally NOT settable here. Only the
// dedicated /mark-paid test endpoint below can change it until the gateway
// lands.
//
// Cancelling does not restore variant stock — noted as future improvement.
// ---------------------------------------------------------------------------
router.patch('/admin/orders/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  const { fulfillment_status, archived } = req.body || {};

  const updates = {};
  const values = [];

  if (fulfillment_status !== undefined) {
    if (!ALLOWED_FULFILLMENT.includes(fulfillment_status)) {
      return res.status(400).json({ error: 'Invalid fulfillment_status.' });
    }
    values.push(fulfillment_status);
    updates.fulfillment_status = `$${values.length}`;
  }

  if (archived !== undefined) {
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'archived must be true or false.' });
    }
    values.push(archived);
    updates.archived = `$${values.length}`;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const setClauses = Object.entries(updates).map(
    ([col, placeholder]) => `${col} = ${placeholder}`
  );
  setClauses.push('updated_at = NOW()');
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE orders
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const updatedOrder = result.rows[0];

    // --- NOTIFICATION TRIGGER ---
    if (fulfillment_status !== undefined) {
      // Fetch customer's push token
      const userRes = await pool.query('SELECT expo_push_token FROM users WHERE id = $1', [updatedOrder.user_id]);
      const pushToken = userRes.rows[0]?.expo_push_token;
      
      const message = `Your order ${updatedOrder.order_number} status has been updated to: ${fulfillment_status.toUpperCase()}.`;
      
      await pool.query(
        `INSERT INTO notifications (customer_id, title, message, type)
         VALUES ($1, $2, $3, 'order')`,
        [updatedOrder.user_id, 'Order Update', message]
      );

      sendExpoPush(pushToken, 'Order Update', message);
    }
    // ----------------------------

    res.json({ data: updatedOrder });
  } catch (error) {
    console.error('Admin update order failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/orders/:id/mark-paid
//
// TEST-MODE ONLY. Sets payment_status = 'paid' and paid_at = NOW().
// This exists because the real payment gateway is not built yet, and we
// still need to verify the rest of the order flow. Remove or lock behind a
// feature flag when the gateway lands.
// ---------------------------------------------------------------------------
router.post('/admin/orders/:id/mark-paid', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, order_number, payment_status, paid_at, updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      data: {
        ...result.rows[0],
        note: 'TEST MODE — the real payment gateway is not implemented yet.',
      },
    });
  } catch (error) {
    console.error('Admin mark-paid failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/orders/:id — soft delete
// ---------------------------------------------------------------------------
router.delete('/admin/orders/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, order_number, deleted_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Admin delete order failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/prescriptions/:id — stream a prescription file to the admin
//
// Admins need to see the prescriptions their customers upload. The customer
// endpoint /api/prescriptions/:id only works for the owner. This one is
// gated by admin auth.
// ---------------------------------------------------------------------------
router.get('/admin/prescriptions/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Invalid prescription ID.' });
  }

  try {
    const result = await pool.query(
      `SELECT filename, original_name, mime_type
       FROM prescriptions
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }

    const row = result.rows[0];
    const filePath = path.join(PRESCRIPTION_UPLOAD_DIR, row.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(410).json({ error: 'File is no longer available.' });
    }

    res.setHeader('Content-Type', row.mime_type);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.original_name.replace(/"/g, '')}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Admin prescription fetch failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;