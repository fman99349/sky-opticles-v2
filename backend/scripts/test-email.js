// backend/scripts/test-email.js
// Quick check that SMTP credentials work. Sends one plain email.
// Usage: node scripts/test-email.js [recipient]

require('dotenv').config();
const { sendEmail } = require('../src/utils/email');

(async () => {
  const to = process.argv[2] || process.env.SMTP_USER;
  if (!to) {
    console.error('No recipient. Pass an email address or set SMTP_USER.');
    process.exit(1);
  }

  console.log(`Sending test email to ${to}...`);
  const r = await sendEmail({
    to,
    subject: 'Diamond Dee email test',
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h1 style="color:#101D2C;">It works ✓</h1>
        <p>If you're reading this, your SMTP setup is correct.</p>
        <p style="color:#7C8792; font-size: 12px;">Sent ${new Date().toISOString()}</p>
      </div>
    `,
  });

  if (r.ok) {
    console.log('✓ Email sent. Check your inbox (and spam folder).');
    process.exit(0);
  } else {
    console.error('✗ Failed:', r.error);
    process.exit(1);
  }
})();