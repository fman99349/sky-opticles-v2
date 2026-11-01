// backend/src/routes/sellerApplications.js
//
// Public endpoint: POST /api/seller-applications          — submit application
// Public endpoint: GET  /api/seller-applications/:ref     — check status by reference
//
// Admin endpoints (requireAdmin):
//   GET    /api/admin/seller-applications
//   GET    /api/admin/seller-applications/:id
//   PATCH  /api/admin/seller-applications/:id
//   POST   /api/admin/seller-applications/:id/invite
//
// On submit, sends two emails:
//   1. Admin notification → ADMIN_NOTIFY_EMAIL (defaults to francewitness9@gmail.com)
//   2. Applicant confirmation with reference code

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'francewitness9@gmail.com';
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@diamonddee.com';
const APP_URL = process.env.APP_PUBLIC_URL || 'https://diamonddee.com';

const ALLOWED_SHOP_TYPES = [
  'optical_frame', 'sunglasses', 'lenses',
  'contact_lenses', 'accessory', 'other',
];
const ALLOWED_CURRENCIES = ['ZAR', 'USD', 'GBP'];
const ALLOWED_TIME_FRAMES = ['trial_14d', '3m', '6m', '1y', 'ongoing'];
const MAX_DESCRIPTION_LENGTH = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// Email transporter (lazy)
// ─────────────────────────────────────────────────────────────────────────────
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[seller-applications] SMTP not configured — emails will be skipped.');
    return null;
  }
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
}

async function sendEmail({ to, subject, html, replyTo }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[seller-applications] (email skipped) to=${to} subject="${subject}"`);
    return;
  }
  try {
    await t.sendMail({ from: FROM_EMAIL, to, subject, html, replyTo });
    console.log(`[seller-applications] Email sent to ${to}`);
  } catch (err) {
    console.error(`[seller-applications] Email failed to ${to}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeReferenceCode() {
  // Format: DD-XXXXX (5 uppercase alphanumeric, no ambiguous chars)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) s += alphabet[bytes[i] % alphabet.length];
  return `DD-${s}`;
}

function isValidEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TIME_FRAME_LABELS = {
  trial_14d: '14-day trial',
  '3m': '3 months',
  '6m': '6 months',
  '1y': '1 year',
  ongoing: 'Ongoing',
};

const SHOP_TYPE_LABELS = {
  optical_frame: 'Optical frames',
  sunglasses: 'Sunglasses',
  lenses: 'Prescription lenses',
  contact_lenses: 'Contact lenses',
  accessory: 'Accessories',
  other: 'Other',
};

function validateApplication(body) {
  const errors = [];
  const out = {};

  if (!body.full_name || body.full_name.trim().length < 2) {
    errors.push('Full name is required (min 2 characters).');
  } else out.full_name = body.full_name.trim().slice(0, 120);

  if (!isValidEmail(body.email)) errors.push('Valid email is required.');
  else out.email = body.email.trim().toLowerCase().slice(0, 180);

  if (!body.phone || body.phone.trim().length < 6) errors.push('Phone number is required.');
  else out.phone = body.phone.trim().slice(0, 40);

  if (!body.whatsapp || body.whatsapp.trim().length < 6) errors.push('WhatsApp number is required.');
  else out.whatsapp = body.whatsapp.trim().slice(0, 40);

  out.business_name = body.business_name ? body.business_name.trim().slice(0, 120) : null;

  if (!body.city || body.city.trim().length < 2) errors.push('City is required.');
  else out.city = body.city.trim().slice(0, 100);

  if (!body.province || body.province.trim().length < 2) errors.push('Province is required.');
  else out.province = body.province.trim().slice(0, 100);

  out.country = (body.country || 'South Africa').trim().slice(0, 80);

  if (!Array.isArray(body.shop_types) || body.shop_types.length === 0) {
    errors.push('Select at least one product type.');
  } else {
    const invalid = body.shop_types.filter((t) => !ALLOWED_SHOP_TYPES.includes(t));
    if (invalid.length) errors.push(`Invalid product type(s): ${invalid.join(', ')}.`);
    else out.shop_types = [...new Set(body.shop_types)];
  }

  if (!Array.isArray(body.currencies) || body.currencies.length === 0) {
    errors.push('Select at least one currency.');
  } else {
    const invalid = body.currencies.filter((c) => !ALLOWED_CURRENCIES.includes(c));
    if (invalid.length) errors.push(`Invalid currency: ${invalid.join(', ')}.`);
    else out.currencies = [...new Set(body.currencies)];
  }

  if (!ALLOWED_TIME_FRAMES.includes(body.time_frame)) {
    errors.push('Choose how long you want to sell.');
  } else out.time_frame = body.time_frame;

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') errors.push('Description must be text.');
    else if (body.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description max ${MAX_DESCRIPTION_LENGTH} characters.`);
    } else out.description = body.description.trim() || null;
  }

  return { ok: errors.length === 0, errors, data: out };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────────────────────
function buildAdminEmail(app, reference) {
  const shopTypeList = (app.shop_types || []).map((t) => SHOP_TYPE_LABELS[t] || t).join(', ');
  const currencyList = (app.currencies || []).join(', ');
  const timeframeLabel = TIME_FRAME_LABELS[app.time_frame] || app.time_frame;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #101D2C;">
      <div style="background: #101D2C; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #D7B987; margin: 0; font-size: 18px;">New seller application</h2>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px;">Reference: <strong style="color: #D7B987;">${escapeHtml(reference)}</strong></p>
      </div>
      <div style="background: #ffffff; border: 1px solid #E7E3DC; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #7C8792; width: 160px;">Name</td><td style="padding: 6px 0;"><strong>${escapeHtml(app.full_name)}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Business name</td><td style="padding: 6px 0;">${escapeHtml(app.business_name || '—')}</td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(app.email)}" style="color: #2E8D86;">${escapeHtml(app.email)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Phone</td><td style="padding: 6px 0;">${escapeHtml(app.phone)}</td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">WhatsApp</td><td style="padding: 6px 0;">${escapeHtml(app.whatsapp)}</td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Location</td><td style="padding: 6px 0;">${escapeHtml(app.city)}, ${escapeHtml(app.province)}, ${escapeHtml(app.country)}</td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Product types</td><td style="padding: 6px 0;">${escapeHtml(shopTypeList)}</td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Currencies</td><td style="padding: 6px 0;">${escapeHtml(currencyList)}</td></tr>
          <tr><td style="padding: 6px 0; color: #7C8792;">Time frame</td><td style="padding: 6px 0;">${escapeHtml(timeframeLabel)}</td></tr>
        </table>
        ${app.description ? `
          <div style="margin-top: 16px; padding: 12px; background: #F8F5EF; border-radius: 6px; font-size: 13px;">
            <div style="color: #7C8792; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Message</div>
            ${escapeHtml(app.description)}
          </div>
        ` : ''}
        <p style="margin-top: 24px; font-size: 12px; color: #7C8792;">
          Review in the admin panel → <strong>Sellers → Applications</strong>.
        </p>
      </div>
    </div>
  `;
}

function buildApplicantEmail(app, reference) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #101D2C;">
      <div style="background: #101D2C; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="color: #D7B987; margin: 0; font-size: 22px; letter-spacing: 1px;">DIAMOND DEE</h2>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px; letter-spacing: 2px;">MARKETPLACE</p>
      </div>
      <div style="background: #ffffff; border: 1px solid #E7E3DC; border-top: 0; padding: 32px 24px; border-radius: 0 0 8px 8px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #101D2C;">Application received ✨</h2>
        <p style="margin: 0 0 20px; color: #7C8792; font-size: 14px; line-height: 1.6;">
          Hi ${escapeHtml(app.full_name.split(' ')[0])}, thank you for applying to sell on the Diamond Dee Marketplace.
        </p>
        <div style="padding: 16px; background: #F8F5EF; border-left: 4px solid #D7B987; border-radius: 4px; margin-bottom: 24px;">
          <div style="font-size: 11px; color: #7C8792; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Your reference number</div>
          <div style="font-family: monospace; font-size: 18px; font-weight: 900; color: #101D2C; letter-spacing: 2px;">${escapeHtml(reference)}</div>
        </div>
        <p style="font-size: 14px; color: #101D2C; line-height: 1.7;">
          Our team reviews every application within <strong>48 hours</strong>. If approved, you'll receive a follow-up email with a link to set up your shop.
        </p>
        <p style="font-size: 14px; color: #101D2C; line-height: 1.7; margin-top: 16px;">
          Keep your reference number handy — you can use it to check the status of your application any time.
        </p>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E7E3DC; text-align: center;">
          <a href="${APP_URL}" style="display: inline-block; background: #D7B987; color: #101D2C; text-decoration: none; padding: 12px 32px; border-radius: 4px; font-weight: 900; font-size: 12px; letter-spacing: 1px;">VISIT DIAMOND DEE</a>
        </div>
        <p style="font-size: 11px; color: #7C8792; text-align: center; margin-top: 24px;">
          Questions? Reply to this email and our team will help.
        </p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/seller-applications — PUBLIC
// ─────────────────────────────────────────────────────────────────────────────
router.post('/seller-applications', async (req, res) => {
  try {
    const v = validateApplication(req.body || {});
    if (!v.ok) return res.status(400).json({ error: v.errors.join(' ') });

    // Prevent duplicate pending applications with the same email
    const existing = await pool.query(
      `SELECT id, reference_code FROM shop_applications
        WHERE LOWER(email) = LOWER($1) AND status IN ('pending','contacted')`,
      [v.data.email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `You already have a pending application (ref: ${existing.rows[0].reference_code}). We'll be in touch soon.`,
      });
    }

    // Generate unique reference code (retry on collision)
    let reference;
    for (let i = 0; i < 5; i++) {
      reference = makeReferenceCode();
      const collide = await pool.query(
        'SELECT 1 FROM shop_applications WHERE reference_code = $1',
        [reference]
      );
      if (collide.rows.length === 0) break;
      if (i === 4) return res.status(500).json({ error: 'Could not generate reference code. Try again.' });
    }

    const result = await pool.query(
      `INSERT INTO shop_applications
         (reference_code, full_name, email, phone, whatsapp, business_name,
          city, province, country, shop_types, currencies, time_frame, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13)
       RETURNING *`,
      [
        reference,
        v.data.full_name, v.data.email, v.data.phone, v.data.whatsapp,
        v.data.business_name,
        v.data.city, v.data.province, v.data.country,
        JSON.stringify(v.data.shop_types),
        JSON.stringify(v.data.currencies),
        v.data.time_frame,
        v.data.description || null,
      ]
    );
    const app = result.rows[0];

    // Fire both emails (fire-and-forget, don't block response)
    sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `🏪 New seller application: ${app.business_name || app.full_name} (${reference})`,
      html: buildAdminEmail(app, reference),
      replyTo: app.email,
    }).catch(() => {});

    sendEmail({
      to: app.email,
      subject: `Application received — Diamond Dee Marketplace (${reference})`,
      html: buildApplicantEmail(app, reference),
    }).catch(() => {});

    res.status(201).json({
      data: {
        id: app.id,
        reference_code: app.reference_code,
        email: app.email,
        message: 'Application received. Check your email for confirmation.',
      },
    });
  } catch (err) {
    console.error('Submit seller application failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/seller-applications/:reference — PUBLIC status check
// ─────────────────────────────────────────────────────────────────────────────
router.get('/seller-applications/:reference', async (req, res) => {
  try {
    const ref = String(req.params.reference || '').toUpperCase().trim();
    if (!/^DD-[A-Z2-9]{5}$/.test(ref)) {
      return res.status(400).json({ error: 'Invalid reference code format.' });
    }
    const r = await pool.query(
      `SELECT reference_code, full_name, status, created_at, invited_at
         FROM shop_applications WHERE reference_code = $1`,
      [ref]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });
    res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('Get seller application status failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET /api/admin/seller-applications
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/seller-applications', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const values = [];
    if (status && ['pending','contacted','invited','rejected'].includes(status)) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT * FROM shop_applications ${where} ORDER BY created_at DESC LIMIT 500`,
      values
    );

    const counts = await pool.query(
      `SELECT status, COUNT(*)::int AS n FROM shop_applications GROUP BY status`
    );

    res.json({
      data: r.rows,
      counts: Object.fromEntries(counts.rows.map((x) => [x.status, x.n])),
    });
  } catch (err) {
    console.error('List seller applications failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET /api/admin/seller-applications/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/seller-applications/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
    const r = await pool.query('SELECT * FROM shop_applications WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('Get seller application failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: PATCH /api/admin/seller-applications/:id
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/admin/seller-applications/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });

    const { status, admin_notes, rejection_reason } = req.body || {};
    const sets = [];
    const values = [];

    if (status !== undefined) {
      if (!['pending','contacted','invited','rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }
      values.push(status);
      sets.push(`status = $${values.length}`);
    }
    if (admin_notes !== undefined) {
      values.push(admin_notes || null);
      sets.push(`admin_notes = $${values.length}`);
    }
    if (rejection_reason !== undefined) {
      values.push(rejection_reason || null);
      sets.push(`rejection_reason = $${values.length}`);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(id);
    const r = await pool.query(
      `UPDATE shop_applications SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('Update seller application failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: POST /api/admin/seller-applications/:id/invite
// ─────────────────────────────────────────────────────────────────────────────
// Creates an invite for the applicant's email via the existing shopInvites module.
// Marks the application as invited.
router.post('/admin/seller-applications/:id/invite', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });

    const appRes = await client.query('SELECT * FROM shop_applications WHERE id = $1', [id]);
    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });
    const application = appRes.rows[0];

    if (application.status === 'invited') {
      return res.status(409).json({ error: 'Already invited.' });
    }
    if (application.status === 'rejected') {
      return res.status(409).json({ error: 'Cannot invite a rejected application.' });
    }

    // Create an invite via the shop_invites table (schema mirrors shopsInvites module)
    // NOTE: This matches the pattern used elsewhere. If your invites table differs,
    // adjust the INSERT below.
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await client.query('BEGIN');

    const inviteRes = await client.query(
      `INSERT INTO shop_invites (email, token, expires_at, created_by_admin_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [application.email, token, expiresAt, req.admin.id]
    );
    const inviteId = inviteRes.rows[0].id;

    await client.query(
      `UPDATE shop_applications
         SET status = 'invited', invited_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    // Email the applicant their invite link
    const inviteUrl = `${APP_URL.replace(/\/$/, '')}/invite/${token}`;
    sendEmail({
      to: application.email,
      subject: `You're invited to sell on Diamond Dee Marketplace 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #101D2C;">
          <div style="background: #101D2C; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #D7B987; margin: 0; font-size: 22px; letter-spacing: 1px;">DIAMOND DEE</h2>
          </div>
          <div style="background: #ffffff; border: 1px solid #E7E3DC; border-top: 0; padding: 32px 24px; border-radius: 0 0 8px 8px;">
            <h2 style="margin: 0 0 8px; font-size: 20px;">You're approved 🎉</h2>
            <p style="margin: 0 0 20px; color: #7C8792; font-size: 14px; line-height: 1.6;">
              Hi ${escapeHtml(application.full_name.split(' ')[0])}, we'd love to have you onboard. Click the button below to set up your shop.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(inviteUrl)}" style="display: inline-block; background: #D7B987; color: #101D2C; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-weight: 900; font-size: 12px; letter-spacing: 1px;">CREATE MY SHOP</a>
            </div>
            <p style="font-size: 11px; color: #7C8792; text-align: center;">
              This link expires on ${expiresAt.toLocaleString('en-ZA')}.<br/>
              Or copy it: <span style="font-family: monospace;">${escapeHtml(inviteUrl)}</span>
            </p>
          </div>
        </div>
      `,
    }).catch(() => {});

    res.json({
      data: {
        invite_id: inviteId,
        invite_url: inviteUrl,
        expires_at: expiresAt,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Invite from application failed:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
});

module.exports = router;