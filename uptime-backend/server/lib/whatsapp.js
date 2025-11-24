import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendTemplateWhatsApp(phone, templateName, params = []) {
  const url = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  if(!url || !apiKey) {
    console.warn('WhatsApp not configured (WHATSAPP_API_URL / WHATSAPP_API_KEY missing).');
    return false;
  }

  const body = {
    to: phone.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { policy: 'deterministic', code: 'en' },
      components: [
        {
          type: 'body',
          parameters: params.map(p => ({ type: 'text', text: String(p) }))
        }
      ]
    }
  };

  try {
    const res = await axios.post(url, body, {
      headers: {
        'D360-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return res.data;
  } catch (err) {
    console.error('360Dialog send error:', err.response?.data || err.message);
    return null;
  }
}
