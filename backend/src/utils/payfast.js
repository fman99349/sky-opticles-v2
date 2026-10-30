// backend/src/utils/payfast.js
//
// PayFast integration helpers.
//
// The signature generation here must match PHP's urlencode() exactly.
// PayFast's backend is PHP and uses PHP's urlencode(), which has quirks
// that JavaScript's encodeURIComponent does NOT:
//   1. Space is encoded as + (not %20)
//   2. These chars are encoded: ! ' ( ) * ~

const crypto = require('crypto');

function phpUrlEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E');
}

// PayFast requires fields in the EXACT order shown in their documentation,
// NOT alphabetical order. This is the canonical order for checkout forms.
const PAYFAST_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
];

function buildSignature(fields, passphrase) {
  const parts = [];

  // First pass: emit fields in canonical order
  for (const key of PAYFAST_FIELD_ORDER) {
    if (key === 'signature') continue;
    const value = fields[key];
    if (value === '' || value === null || value === undefined) continue;
    parts.push(`${key}=${phpUrlEncode(String(value).trim())}`);
  }

  // Second pass: emit any fields not in the canonical list
  for (const key of Object.keys(fields)) {
    if (PAYFAST_FIELD_ORDER.includes(key)) continue;
    if (key === 'signature') continue;
    const value = fields[key];
    if (value === '' || value === null || value === undefined) continue;
    parts.push(`${key}=${phpUrlEncode(String(value).trim())}`);
  }

  // Append passphrase only if it's set. PayFast docs:
  // "If you do not have a passphrase set, do not include the passphrase
  //  in the string."
  const safePassphrase = String(passphrase ?? '').trim();
  if (safePassphrase) {
    parts.push(`passphrase=${phpUrlEncode(safePassphrase)}`);
  }

  const signingString = parts.join('&');
  return crypto.createHash('md5').update(signingString).digest('hex');
}

function getPayfastProcessUrl() {
  return process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
}

function getPayfastValidateUrl() {
  return process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';
}

function buildPaymentFields({ order, returnUrl, cancelUrl, notifyUrl, merchantId, merchantKey, passphrase }) {
  // Validate required config upfront with clear messages.
  const missing = [];
  if (!merchantId)  missing.push('PAYFAST_MERCHANT_ID');
  if (!merchantKey) missing.push('PAYFAST_MERCHANT_KEY');
  if (!returnUrl)   missing.push('PAYFAST_RETURN_URL');
  if (!cancelUrl)   missing.push('PAYFAST_CANCEL_URL');
  if (!notifyUrl)   missing.push('PAYFAST_NOTIFY_URL');
  if (missing.length > 0) {
    throw new Error(`PayFast configuration missing: ${missing.join(', ')}. Check backend/.env and restart.`);
  }

  const parts = String(order.customer_name || 'Customer').trim().split(/\s+/);
  const nameFirst = parts[0] || 'Customer';
  const nameLast = parts.slice(1).join(' ') || 'User';

  // PayFast ONLY processes ZAR. If the customer checked out in USD/GBP/EUR,
  // we must charge them the ZAR equivalent (base_total).
  const amountToCharge = Number(order.base_total || order.total).toFixed(2);

  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    name_first: nameFirst,
    name_last: nameLast,
    email_address: order.customer_email || 'noreply@diamonddee.local',
    m_payment_id: String(order.id),
    amount: amountToCharge,
    item_name: `Order ${order.order_number}`.slice(0, 100),
  };

  const signature = buildSignature(fields, passphrase);
  return { ...fields, signature };
}

// ITN signature verification uses ALPHABETICAL field order — different
// from the payment-form signature (which uses canonical order).
function buildItnSignature(itnFields, passphrase) {
  const sortedKeys = Object.keys(itnFields).sort();
  const parts = [];
  for (const key of sortedKeys) {
    if (key === 'signature') continue;
    const value = itnFields[key];
    if (value === '' || value === null || value === undefined) continue;
    parts.push(`${key}=${phpUrlEncode(String(value).trim())}`);
  }
  const safePassphrase = String(passphrase ?? '').trim();
  if (safePassphrase) {
    parts.push(`passphrase=${phpUrlEncode(safePassphrase)}`);
  }
  const signingString = parts.join('&');
  return crypto.createHash('md5').update(signingString).digest('hex');
}

function verifyItnSignature(itnFields, passphrase) {
  const received = itnFields.signature;
  if (!received) return false;
  const rebuilt = buildItnSignature(itnFields, passphrase);
  return rebuilt === received;
}

module.exports = {
  phpUrlEncode,
  buildSignature,
  buildItnSignature,
  verifyItnSignature,
  getPayfastProcessUrl,
  getPayfastValidateUrl,
  buildPaymentFields,
};