import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendEmail(to, subject, text) {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL || 'alerts@yourdomain.com';
  if(!key) {
    console.warn('SendGrid API key not configured. Skipping email.');
    return false;
  }
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from },
    subject,
    content: [{ type: 'text/plain', value: text }]
  };
  try {
    await axios.post('https://api.sendgrid.com/v3/mail/send', body, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    return true;
  } catch (err) {
    console.error('SendGrid error:', err.response?.data || err.message);
    return false;
  }
}
