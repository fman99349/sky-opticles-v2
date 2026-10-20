// Customer-facing order endpoints.
//
// POST /api/orders     — place an order from the cart
// GET  /api/orders     — current customer's orders
// GET  /api/orders/:id — one order with items
//
// All three require a customer JWT. Admin tokens are rejected (403).
//
// Price validation: the backend owns lens prices (see lens_options table).
// The mobile client sends the customer's chosen config; the backend
// recomputes the lens delta from the database and ignores whatever delta
// the client reported. Total, subtotal, and line_totals are all computed
// server-side. A client cannot pay less by tampering with the payload.
//
// Snapshot principle: customer identity and shipping address are copied
// onto the order. The `users` row can be updated later without changing
// past orders.

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendExpoPush } = require('../utils/expoPush');

const router = express.Router();

// ---------------------------------------------------------------------------
// Auth middleware — customer only. Duplicated from prescriptions.js so this
// file is self-contained. Extract to a shared module when a third copy
// appears.
// ---------------------------------------------------------------------------
async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res
      .status(401)
      .json({ error: 'Missing or malformed Authorization header.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server auth is not configured.' });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], secret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (payload.role === 'admin') {
    return res.status(403).json({ error: 'Customer access required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, expo_push_token FROM users WHERE id = $1',
      [payload.sub]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    req.customer = result.rows[0];
    next();
  } catch (error) {
    console.error('requireCustomer failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Load all lens option prices as a Map<group_key, Map<option_key, price_delta>>.
// Called once per order request — tiny data, single query.
async function loadLensPriceIndex(client) {
  const result = await client.query(
    `SELECT g.group_key, o.option_key, o.price_delta
     FROM lens_option_groups g
     JOIN lens_options o ON o.group_id = g.id`
  );

  const index = new Map();
  for (const row of result.rows) {
    if (!index.has(row.group_key)) index.set(row.group_key, new Map());
    index.get(row.group_key).set(row.option_key, Number(row.price_delta));
  }
  return index;
}

// Compute the lens delta for a config against the DB price index.
// Only counts groups that apply to the product type AND are present in the
// config. Unknown or missing keys are ignored, not rejected — the schema
// is additive over time, and an old config should not fail.
//
// If the customer chose frameOnly, delta is 0 regardless of other fields.
function computeLensDelta(productType, config, index) {
  if (!config || typeof config !== 'object') return 0;
  if (config.frameOnly === true) return 0;

  let delta = 0;
  for (const [groupKey, optionsMap] of index.entries()) {
    const selectedKey = config[groupKey];
    if (!selectedKey) continue;
    const price = optionsMap.get(selectedKey);
    if (typeof price === 'number') delta += price;
  }
  return delta;
}

// Return the group keys that apply to a product type. The order handler
// does not currently use this, but the admin view and mobile wizard will
// benefit from having it here for future sharing.
async function groupsForProductType(client, productType) {
  const result = await client.query(
    `SELECT group_key
     FROM lens_option_groups
     WHERE $1 = ANY (applies_to)`,
    [productType]
  );
  return result.rows.map((r) => r.group_key);
}

// Format "SO-YYYY-NNNNN" from the current year and a sequence value.
function formatOrderNumber(seqValue) {
  const year = new Date().getFullYear();
  const padded = String(seqValue).padStart(5, '0');
  return `SO-${year}-${padded}`;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function nonEmptyString(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

// Validate the shipping payload. Returns { ok, error } or { ok, data }.
function validateShipping(shipping) {
  if (!shipping || typeof shipping !== 'object') {
    return { ok: false, error: 'shipping is required.' };
  }

  const required = [
    ['line1', 200],
    ['city', 100],
    ['postalCode', 20],
    ['province', 100],
    ['country', 80],
  ];

  for (const [field, max] of required) {
    if (!nonEmptyString(shipping[field], max)) {
      return {
        ok: false,
        error: `shipping.${field} is required (max ${max} chars).`,
      };
    }
  }

  if (
    shipping.line2 !== undefined &&
    shipping.line2 !== null &&
    (typeof shipping.line2 !== 'string' || shipping.line2.length > 200)
  ) {
    return { ok: false, error: 'shipping.line2 must be at most 200 chars.' };
  }

  return {
    ok: true,
    data: {
      line1: shipping.line1.trim(),
      line2: typeof shipping.line2 === 'string' && shipping.line2.trim()
        ? shipping.line2.trim()
        : null,
      city: shipping.city.trim(),
      postalCode: shipping.postalCode.trim(),
      province: shipping.province.trim(),
      country: shipping.country.trim(),
    },
  };
}

// Validate the customer contact payload.
function validateCustomerContact(customer) {
  if (!customer || typeof customer !== 'object') {
    return { ok: false, error: 'customer is required.' };
  }

  if (!nonEmptyString(customer.name, 120)) {
    return { ok: false, error: 'customer.name is required (max 120).' };
  }

  if (!nonEmptyString(customer.phone, 40)) {
    return { ok: false, error: 'customer.phone is required (max 40).' };
  }

  return {
    ok: true,
    data: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/orders
// ---------------------------------------------------------------------------
router.post('/orders', requireCustomer, async (req, res) => {
  const body = req.body || {};

  const shippingCheck = validateShipping(body.shipping);
  if (!shippingCheck.ok) {
    return res.status(400).json({ error: shippingCheck.error });
  }

  const customerCheck = validateCustomerContact(body.customer);
  if (!customerCheck.ok) {
    return res.status(400).json({ error: customerCheck.error });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required.' });
  }

  const client = await pool.connect();
  let tx = false;

  try {
    await client.query('BEGIN');
    tx = true;

    // 1. Load lens prices once.
    const priceIndex = await loadLensPriceIndex(client);

    // 2. Validate each item shape up front (before hitting the DB for products)
    const normalizedItems = [];
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const prefix = `items[${i}]`;

      if (!item || typeof item !== 'object') {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(400).json({ error: `${prefix} is invalid.` });
      }
      if (!isPositiveInt(Number(item.productId))) {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(400).json({ error: `${prefix}.productId is invalid.` });
      }
      if (!isPositiveInt(Number(item.quantity))) {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(400).json({ error: `${prefix}.quantity is invalid.` });
      }
      const productId = Number(item.productId);
      const variantId = item.variantId ? Number(item.variantId) : null;
      if (variantId !== null && !isPositiveInt(variantId)) {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(400).json({ error: `${prefix}.variantId is invalid.` });
      }
      const config = item.config && typeof item.config === 'object'
        ? item.config
        : {};

      normalizedItems.push({
        productId,
        variantId,
        quantity: Number(item.quantity),
        config,
      });
    }

    // 3. Load all referenced products in one query.
    const productIds = [...new Set(normalizedItems.map((i) => i.productId))];
    const productsResult = await client.query(
      `SELECT id, name, slug, product_type, price, status
       FROM products
       WHERE id = ANY($1::bigint[])`,
      [productIds]
    );
    const productMap = new Map(productsResult.rows.map((p) => [Number(p.id), p]));

    // 4. Load all referenced variants in one query.
    const variantIds = normalizedItems
      .map((i) => i.variantId)
      .filter((v) => v !== null);
    let variantMap = new Map();
    if (variantIds.length > 0) {
            const variantsResult = await client.query(
        `SELECT id, product_id, sku, price_override, attributes
         FROM product_variants
         WHERE id = ANY($1::bigint[])`,
        [variantIds]
      );
      variantMap = new Map(
        variantsResult.rows.map((v) => [Number(v.id), v])
      );
    }

    // 5. Compute per-item pricing and gather prescription ownership checks.
    const preparedItems = [];
    let subtotal = 0;
    const prescriptionIdsToVerify = [];

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(400).json({
          error: `Product ${item.productId} does not exist.`,
        });
      }
      if (product.status !== 'active') {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(400).json({
          error: `Product "${product.name}" is not available for purchase.`,
        });
      }

      let variant = null;
      if (item.variantId !== null) {
        variant = variantMap.get(item.variantId);
        if (!variant || Number(variant.product_id) !== Number(product.id)) {
          await client.query('ROLLBACK');
          tx = false;
          return res.status(400).json({
            error: `Variant ${item.variantId} does not belong to product ${item.productId}.`,
          });
        }
      }

      // Base price: variant override if present, otherwise product price.
      const basePrice =
        variant && variant.price_override !== null
          ? Number(variant.price_override)
          : Number(product.price);

      const lensDelta = computeLensDelta(
        product.product_type,
        item.config,
        priceIndex
      );
      const unitPrice = basePrice + lensDelta;
      const lineTotal = unitPrice * item.quantity;

      // Prescription ownership — if the config includes an uploadId,
      // capture it and verify it belongs to this customer.
      let prescriptionId = null;
      const rx = item.config.prescription;
      if (rx && rx.uploadId) {
        prescriptionId = Number(rx.uploadId);
        prescriptionIdsToVerify.push(prescriptionId);
      }

           preparedItems.push({
        product_id: Number(product.id),
        variant_id: variant ? Number(variant.id) : null,
        prescription_id: prescriptionId,
        product_name: product.name,
        product_slug: product.slug,
        variant_sku: variant ? variant.sku : null,
        variant_attributes: variant?.attributes || null,
        lens_config: item.config,
        base_price: basePrice,
        lens_delta: lensDelta,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: lineTotal,
        _variantToDecrement: variant ? variant.id : null,
      });

      subtotal += lineTotal;
    }

    // 6. Verify prescription ownership in one query.
    if (prescriptionIdsToVerify.length > 0) {
      const rxResult = await client.query(
        `SELECT id FROM prescriptions
         WHERE id = ANY($1::bigint[]) AND user_id = $2`,
        [prescriptionIdsToVerify, req.customer.id]
      );
      const ownedIds = new Set(rxResult.rows.map((r) => Number(r.id)));
      for (const pid of prescriptionIdsToVerify) {
        if (!ownedIds.has(pid)) {
          await client.query('ROLLBACK');
          tx = false;
          return res.status(400).json({
            error: `Prescription ${pid} does not belong to this account.`,
          });
        }
      }
    }

    // 7. Generate order number.
    const seq = await client.query("SELECT nextval('orders_number_seq') AS v");
    const orderNumber = formatOrderNumber(seq.rows[0].v);

    // 8. Insert order.
    const shippingCost = 0;
    const total = subtotal + shippingCost;

    const orderInsert = await client.query(
      `INSERT INTO orders (
        order_number, user_id,
        customer_name, customer_email, customer_phone,
        shipping_line1, shipping_line2, shipping_city,
        shipping_postal_code, shipping_province, shipping_country,
        subtotal, shipping_cost, total
       ) VALUES (
        $1, $2,
        $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14
       )
       RETURNING *`,
      [
        orderNumber,
        req.customer.id,
        customerCheck.data.name,
        req.customer.email,
        customerCheck.data.phone,
        shippingCheck.data.line1,
        shippingCheck.data.line2,
        shippingCheck.data.city,
        shippingCheck.data.postalCode,
        shippingCheck.data.province,
        shippingCheck.data.country,
        subtotal,
        shippingCost,
        total,
      ]
    );

    const order = orderInsert.rows[0];

    // 9. Insert items.
    for (const pi of preparedItems) {
            await client.query(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, prescription_id,
          product_name, product_slug, variant_sku, lens_config,
          base_price, lens_delta, unit_price, quantity, line_total,
          variant_attributes
         ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14
         )`,
        [
          order.id,
          pi.product_id,
          pi.variant_id,
          pi.prescription_id,
          pi.product_name,
          pi.product_slug,
          pi.variant_sku,
          pi.lens_config,
          pi.base_price,
          pi.lens_delta,
          pi.unit_price,
          pi.quantity,
          pi.line_total,
          pi.variant_attributes,
        ]
      );

      // Decrement variant stock if applicable. Allow negative (backorder);
      // the admin sees LOW badge once stock falls under reorder level.
      if (pi._variantToDecrement !== null) {
        await client.query(
          `UPDATE product_variants
           SET stock_quantity = GREATEST(0, stock_quantity - $1)
           WHERE id = $2`,
          [pi.quantity, pi._variantToDecrement]
        );
      }
    }

    await client.query('COMMIT');
    tx = false;

    // 10. Reload with items for the response.
    const itemsResult = await pool.query(
      `SELECT id, product_id, variant_id, prescription_id,
              product_name, product_slug, variant_sku, lens_config,
              base_price, lens_delta, unit_price, quantity, line_total,
              variant_attributes
       FROM order_items
       WHERE order_id = $1
       ORDER BY id`,
      [order.id]
    );



    // --- NOTIFICATIONS ---
    const customerName = order.customer_name;
    const orderNum = order.order_number;
    
    // 1. Notify Customer
    await client.query(
      `INSERT INTO notifications (customer_id, title, message, type)
       VALUES ($1, $2, $3, 'order')`,
      [req.customer.id, 'Order Placed!', `Your order ${orderNum} has been received and is being processed.`]
    );
    // Push notification to customer
    sendExpoPush(req.customer.expo_push_token, 'Order Placed', `We have received your order ${orderNum}.`);

    // 2. Notify Admin
    // Since we only have one admin for now, we'll hardcode the notification to admin_id = 1.
    await client.query(
      `INSERT INTO notifications (admin_id, title, message, type)
       VALUES ($1, $2, $3, 'order')`,
      [1, 'New Order Received', `${customerName} just placed order ${orderNum} for R ${total}.`]
    );
    // ---------------------


















    res.status(201).json({
      data: {
        id: order.id,
        order_number: order.order_number,
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
        created_at: order.created_at,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    console.error('Create order failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /api/orders — customer's own orders, newest first
// ---------------------------------------------------------------------------
router.get('/orders', requireCustomer, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_number, subtotal, shipping_cost, total,
              payment_status, fulfillment_status, archived, created_at
       FROM orders
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC`,
      [req.customer.id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('List orders failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/orders/:id — one order with items, only if it belongs to the user
// ---------------------------------------------------------------------------
router.get('/orders/:id', requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  try {
    const orderResult = await pool.query(
      `SELECT id, order_number, customer_name, customer_email, customer_phone,
              shipping_line1, shipping_line2, shipping_city,
              shipping_postal_code, shipping_province, shipping_country,
              subtotal, shipping_cost, total,
              payment_status, fulfillment_status, archived,
              paid_at, created_at, updated_at
       FROM orders
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, req.customer.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
            `SELECT id, product_id, variant_id, prescription_id,
              product_name, product_slug, variant_sku, lens_config,
              base_price, lens_delta, unit_price, quantity, line_total,
              variant_attributes
       FROM order_items
       WHERE order_id = $1
       ORDER BY id`,
      [id]
    );

    res.json({
      data: {
        id: order.id,
        order_number: order.order_number,
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
        paid_at: order.paid_at,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get order failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;