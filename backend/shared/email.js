const nodemailer = require('nodemailer');

// In development, we can use a mock transporter or simply log the output if SMTP settings are not provided.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, text, html }) {
  try {
    if (!process.env.SMTP_USER) {
      console.log(`[Mock Email] To: ${to} | Subject: ${subject}`);
      console.log(`Body: ${text}`);
      return;
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Vendor Passport" <no-reply@vendorpassport.com>',
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('Email dispatch failed:', error);
  }
}

module.exports = { sendEmail };
