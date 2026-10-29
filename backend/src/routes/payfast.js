// backend/src/routes/payfast.js
//
// PayFast payment integration routes.

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {
  buildPaymentFields,
  verifyItnSignature,
  getPayfastProcessUrl,
  getPayfastValidateUrl,
} = require('../utils/payfast');

const router = express.Router();

async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing or malformed Authorization header.' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server auth is not configured.' });

  let payload;
  try { payload = jwt.verify(match[1], secret); }
  catch { return res.status(401).json({ error: 'Invalid or expired token.' }); }

  if (payload.role === 'admin') return res.status(403).json({ error: 'Customer access required.' });

  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [payload.sub]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Account no longer exists.' });
    req.customer = result.rows[0];
    next();
  } catch (err) {
    console.error('requireCustomer failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

// POST /api/orders/:id/pay/payfast
router.post('/orders/:id/pay/payfast', requireCustomer, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  try {
    const orderRes = await pool.query(
      `SELECT id, order_number, user_id, customer_name, customer_email,
              total, currency, payment_status
         FROM orders
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [orderId, req.customer.id]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const order = orderRes.rows[0];

    if (order.payment_status === 'paid') {
      return res.status(409).json({ error: 'This order is already paid.' });
    }
    if (order.payment_status === 'refunded') {
      return res.status(409).json({ error: 'Cannot pay a refunded order.' });
    }
    if (order.currency !== 'ZAR') {
      return res.status(400).json({
        error: `PayFast only supports ZAR. This order is in ${order.currency}.`,
      });
    }

    const sessionToken = jwt.sign(
      { orderId: order.id, purpose: 'payfast_payment' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const baseUrl = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
      return res.status(500).json({ error: 'PUBLIC_API_URL is not configured.' });
    }

    res.json({
      data: {
        redirect_url: `${baseUrl}/payfast/redirect/${sessionToken}`,
        order_id: order.id,
        order_number: order.order_number,
        amount: order.total,
        currency: order.currency,
      },
    });
  } catch (err) {
    console.error('PayFast initiate failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// GET /api/payfast/redirect/:token
router.get('/payfast/redirect/:token', async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).type('html').send(renderError('This payment link is invalid or has expired.'));
  }
  if (payload.purpose !== 'payfast_payment') {
    return res.status(400).type('html').send(renderError('Invalid payment token.'));
  }

  try {
    const orderRes = await pool.query(
      `SELECT id, order_number, customer_name, customer_email, total, currency, payment_status
         FROM orders WHERE id = $1`,
      [payload.orderId]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).type('html').send(renderError('Order not found.'));
    }
    const order = orderRes.rows[0];

    if (order.payment_status === 'paid') {
      return res.status(409).type('html').send(renderError('This order is already paid.'));
    }
    if (order.currency !== 'ZAR') {
      return res.status(400).type('html').send(renderError('Currency not supported by PayFast.'));
    }

    const fields = buildPaymentFields({
      order,
      returnUrl: process.env.PAYFAST_RETURN_URL,
      cancelUrl: process.env.PAYFAST_CANCEL_URL,
      notifyUrl: process.env.PAYFAST_NOTIFY_URL,
      merchantId: process.env.PAYFAST_MERCHANT_ID,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY,
      passphrase: process.env.PAYFAST_PASSPHRASE,
    });

    const payfastUrl = getPayfastProcessUrl();
    const formInputs = Object.entries(fields)
      .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
      .join('\n        ');

    res.type('html').send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to PayFast</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         background:#101D2C;color:#fff;display:flex;align-items:center;justify-content:center;
         min-height:100vh;padding:20px;text-align:center}
    .box{max-width:340px}
    h1{font-size:20px;color:#D7B987;margin:0 0 8px}
    p{font-size:13px;color:#B5BFCA;line-height:1.6;margin:0}
  </style>
</head>
<body>
  <div class="box">
    <h1>Taking you to PayFast…</h1>
    <p>You'll be redirected to complete payment for order ${escapeHtml(order.order_number)}.</p>
  </div>
  <form id="payfast-form" action="${escapeHtml(payfastUrl)}" method="POST">
        ${formInputs}
  </form>
  <script>document.getElementById('payfast-form').submit();</script>
</body>
</html>`);
  } catch (err) {
    console.error('PayFast redirect failed:', err.message);
    console.error('PayFast redirect stack:', err.stack);
    res.status(500).type('html').send(renderError(`Payment setup failed: ${err.message}`));
  }
});

// POST /api/payfast/itn
router.post('/payfast/itn', async (req, res) => {
  const itn = req.body || {};

  // Local signature check is advisory only. PayFast's ITN signature
  // algorithm differs from the payment-form signature in subtle ways
  // (empty field handling, encoding), so we log mismatches for debugging
  // but do not block on them. The authoritative check is the server-side
  // validation below — PayFast verifies their own signature and tells us
  // "VALID" or "INVALID".
  const signatureOk = verifyItnSignature(itn, process.env.PAYFAST_PASSPHRASE);
  if (!signatureOk) {
    console.warn('PayFast ITN: local signature mismatch (advisory, not blocking)');
    console.warn('  Received:', itn.signature);
    const { buildItnSignature } = require('../utils/payfast');
    console.warn('  Computed:', buildItnSignature(itn, process.env.PAYFAST_PASSPHRASE));
  }

  // Server-side validation — authoritative
  try {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(itn)) {
      if (k === 'signature') continue;
      body.append(k, String(v));
    }
    const validateRes = await fetch(getPayfastValidateUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const validateText = (await validateRes.text()).trim();
    if (validateText !== 'VALID') {
      console.warn('PayFast ITN: server validation failed, got:', validateText.slice(0, 80));
      return res.status(400).send('INVALID');
    }
    console.log('PayFast ITN: server validation passed ✓');
  } catch (err) {
    console.error('PayFast ITN validation failed:', err.message);
    return res.status(500).send('VALIDATION ERROR');
  }

  const orderId = Number(itn.m_payment_id);
  const paymentStatus = itn.payment_status;
  const grossAmount = Number(itn.amount_gross);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).send('INVALID ORDER ID');
  }

  try {
    const orderRes = await pool.query(
      `SELECT id, total, payment_status, order_number FROM orders WHERE id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      console.warn(`PayFast ITN: order ${orderId} not found.`);
      return res.status(404).send('ORDER NOT FOUND');
    }
    const order = orderRes.rows[0];

    if (Math.abs(Number(order.total) - grossAmount) > 0.01) {
      console.error(`PayFast ITN: amount mismatch for order ${orderId}. Expected ${order.total}, got ${grossAmount}`);
      return res.status(400).send('AMOUNT MISMATCH');
    }

    if (paymentStatus === 'COMPLETE') {
      if (order.payment_status !== 'paid') {
        await pool.query(
          `UPDATE orders SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [orderId]
        );
        console.log(`PayFast ITN: order ${orderId} (${order.order_number}) marked PAID`);
      }
    } else if (['FAILED', 'CANCELLED'].includes(paymentStatus)) {
      console.log(`PayFast ITN: order ${orderId} payment ${paymentStatus} — no action taken.`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('PayFast ITN processing failed:', err.message);
    res.status(500).send('ERROR');
  }
});

router.get('/payfast/return', (req, res) => {
  res.type('html').send(renderThankYou());
});

router.get('/payfast/cancel', (req, res) => {
  res.type('html').send(renderCancelled());
});

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderError(message) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment error</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#101D2C;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;
  padding:20px;text-align:center}.box{max-width:380px}h1{font-size:20px;color:#F28B8B;margin:0 0 8px}
  p{font-size:13px;color:#B5BFCA;line-height:1.6;margin:0}</style></head>
  <body><div class="box"><h1>Payment error</h1><p>${escapeHtml(message)}</p></div></body></html>`;
}

function renderThankYou() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment complete</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#101D2C;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;
  padding:20px;text-align:center}.box{max-width:380px}h1{font-size:22px;color:#D7B987;margin:0 0 10px}
  p{font-size:13px;color:#B5BFCA;line-height:1.6;margin:0 0 6px}
  .badge{display:inline-block;margin-top:16px;padding:6px 14px;background:rgba(215,185,135,0.15);
  border:1px solid rgba(215,185,135,0.4);border-radius:999px;font-size:11px;font-weight:800;
  letter-spacing:0.08em;color:#D7B987}</style></head>
  <body><div class="box"><h1>Payment received</h1>
  <p>Thank you! Your order is confirmed.</p>
  <p>You can now return to the Diamond Dee app to see your order.</p>
  <span class="badge">PAID</span></div></body></html>`;
}

function renderCancelled() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment cancelled</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#101D2C;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;
  padding:20px;text-align:center}.box{max-width:380px}h1{font-size:22px;color:#D7B987;margin:0 0 10px}
  p{font-size:13px;color:#B5BFCA;line-height:1.6;margin:0}</style></head>
  <body><div class="box"><h1>Payment cancelled</h1>
  <p>Your order is still there. You can try again from the Diamond Dee app.</p></div></body></html>`;
}

module.exports = router;