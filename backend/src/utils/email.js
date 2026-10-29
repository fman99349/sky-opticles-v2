const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendEmail({ to, subject, html, text }) {
  // Never throw on failure — email is best-effort, not transactional-critical
  if (!isConfigured()) {
    console.warn(`[email] SMTP not configured, skipped send to ${to}`);
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]+>/g, ''),
    });
    return { ok: true };
  } catch (err) {
    console.error('sendEmail failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };