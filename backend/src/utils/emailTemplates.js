// backend/src/utils/emailTemplates.js
//
// HTML email templates. Every template returns { subject, html } ready for
// sendEmail().
//
// Design notes:
// - All styling is inline. Every email client (Gmail, Outlook, Apple Mail)
//   strips <style> blocks in different ways — inline styles are the only
//   thing that works everywhere.
// - Table-based layout. Email clients still don't reliably support flexbox
//   or grid. Table-based is boring, but it works in every client including
//   Outlook 2010.
// - Brand palette matches the app: navy #101D2C, gold #D7B987, cream
//   #F8F5EF, teal #2E8D86.
// - No external image references. Some clients (Outlook) block images by
//   default. The header uses text + color, no logo image.

const BRAND = {
  navy:      '#101D2C',
  navyLight: '#1D3044',
  gold:      '#D7B987',
  cream:     '#F8F5EF',
  ink:       '#17283A',
  muted:     '#7C8792',
  teal:      '#2E8D86',
  white:     '#FFFFFF',
};

// ── Layout wrapper ────────────────────────────────────────────────
// Every template wraps its body in this.
function layout({ title, preheader, body, cta, ctaUrl, footer }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${preheader || ''}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.cream};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${BRAND.white};border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.navy};padding:24px 28px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:3px;color:${BRAND.gold};">DIAMOND DEE💎</div>
              <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:${BRAND.muted};margin-top:4px;">POWERED BY DMD GENERAL MARKET PLACE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;">
              ${body}
              ${cta && ctaUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 12px;">
                <tr>
                  <td style="background:${BRAND.gold};border-radius:6px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:12px;font-weight:900;letter-spacing:1.2px;color:${BRAND.navy};text-decoration:none;text-transform:uppercase;">${cta}</a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid #E7E3DC;">
              <div style="font-size:11px;color:${BRAND.muted};line-height:1.6;">${footer || 'You received this email because you have an account on Diamond Dee.'}</div>
            </td>
          </tr>
        </table>
        <div style="text-align:center;font-size:10px;color:${BRAND.muted};margin-top:18px;">© ${new Date().getFullYear()} Diamond Dee · General Market Place</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────
function h1(text) {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${BRAND.ink};letter-spacing:-0.4px;">${text}</h1>`;
}
function p(text) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${BRAND.ink};">${text}</p>`;
}
function small(text) {
  return `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted};">${text}</p>`;
}
function bigCode(code) {
  return `<div style="font-size:36px;font-weight:900;letter-spacing:10px;color:${BRAND.navy};padding:20px 0;text-align:center;font-family:'Courier New',monospace;">${code}</div>`;
}

// ── 1. Password reset ─────────────────────────────────────────────
function passwordResetEmail({ name, code }) {
  return {
    subject: 'Reset your Diamond Dee password',
    html: layout({
      title: 'Reset your password',
      preheader: `Your reset code is ${code} — expires in 15 minutes.`,
      body: `
        ${h1(`Hi ${name || 'there'},`)}
        ${p('Someone requested a password reset for your Diamond Dee account. If that was you, use the code below:')}
        ${bigCode(code)}
        ${small('This code expires in 15 minutes. If you didn\'t request this, you can safely ignore this email — your password won\'t change.')}
      `,
      footer: 'For security, never share this code with anyone.',
    }),
  };
}

// ── 2. Welcome ────────────────────────────────────────────────────
function welcomeEmail({ name }) {
  return {
    subject: 'Welcome to Diamond Dee',
    html: layout({
      title: 'Welcome to Diamond Dee',
      preheader: 'Your account is ready. Start exploring.',
      body: `
        ${h1(`Welcome, ${name || 'friend'}!`)}
        ${p('Your Diamond Dee account is ready. Browse shops, configure your eyewear, and check out in seconds.')}
        ${p('We built Diamond Dee so independent sellers can bring their best products to you in one marketplace — no app switching, no compromise.')}
        ${small('Have a question? Reply to this email and someone will get back to you.')}
      `,
    }),
  };
}

// ── 3. Order confirmation ─────────────────────────────────────────
function orderConfirmationEmail({ name, orderNumber, total, currency, items, estimatedDelivery }) {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : 'R';
  const itemLines = (items || []).map((it) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EBE3;font-size:13px;color:${BRAND.ink};">${it.product_name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EBE3;font-size:13px;color:${BRAND.muted};text-align:right;white-space:nowrap;">× ${it.quantity}</td>
      <td style="padding:10px 0 10px 14px;border-bottom:1px solid #F0EBE3;font-size:13px;color:${BRAND.ink};font-weight:700;text-align:right;white-space:nowrap;">${symbol} ${Number(it.line_total).toFixed(2)}</td>
    </tr>
  `).join('');

  const deliveryLine = estimatedDelivery
    ? small(`Estimated delivery: <strong style="color:${BRAND.ink};">${new Date(estimatedDelivery).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>`)
    : '';

  return {
    subject: `Order ${orderNumber} confirmed`,
    html: layout({
      title: `Order ${orderNumber} confirmed`,
      preheader: 'We received your order.',
      body: `
        ${h1(`Thanks, ${name || 'friend'}!`)}
        ${p(`We received your order <strong>${orderNumber}</strong>. You'll get another email when it ships.`)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 4px;">
          ${itemLines}
          <tr>
            <td style="padding:14px 0 0;font-size:13px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.ink};">Total</td>
            <td></td>
            <td style="padding:14px 0 0;font-size:15px;font-weight:900;color:${BRAND.ink};text-align:right;white-space:nowrap;">${symbol} ${Number(total).toFixed(2)}</td>
          </tr>
        </table>
        ${deliveryLine}
      `,
      footer: 'Track your order any time in the Diamond Dee app.',
    }),
  };
}

// ── 4. Seller invite ──────────────────────────────────────────────
function sellerInviteEmail({ inviteUrl, expiresAt }) {
  const expires = new Date(expiresAt).toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return {
    subject: "You're invited to sell on Diamond Dee",
    html: layout({
      title: "You're invited to sell on Diamond Dee",
      preheader: `Your seller invite expires ${expires}.`,
      body: `
        ${h1('Welcome to Diamond Dee')}
        ${p('You\'ve been invited to open a shop on the Diamond Dee marketplace. Click the button below to set your password and create your seller account.')}
        ${small(`This link expires <strong>${expires}</strong>. If you weren\'t expecting this email, you can safely ignore it.`)}
      `,
      cta: 'Accept invite',
      ctaUrl: inviteUrl,
      footer: 'Once you sign up, you\'ll set up your shop profile and submit it for approval.',
    }),
  };
}

module.exports = {
  passwordResetEmail,
  welcomeEmail,
  orderConfirmationEmail,
  sellerInviteEmail,
};