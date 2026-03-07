import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  if (!host || !user || !pass) return null;
  transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  return transporter;
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendClarificationEmail(toEmail, subject, text) {
  const trans = getTransporter();
  if (!trans) return { sent: false, reason: 'Email not configured' };
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@wisdom.edu';
  try {
    await trans.sendMail({ from, to: toEmail, subject, text });
    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { sent: false, reason: err.message };
  }
}
