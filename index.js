const express = require('express');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FORWARD_ENV = process.env.FORWARD_CHAT_IDS || process.env.FORWARD_CHAT_ID;
const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || null;
const BASE_URL = process.env.BASE_URL || null; // opcional (ej: https://mi-app.onrender.com)
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error("❌ Debes definir TELEGRAM_BOT_TOKEN en las variables de entorno.");
  process.exit(1);
}
if (!FORWARD_ENV) {
  console.error("❌ Debes definir FORWARD_CHAT_ID o FORWARD_CHAT_IDS en las variables de entorno.");
  process.exit(1);
}

const FORWARD_CHAT_IDS = FORWARD_ENV.split(',').map(s => s.trim()).filter(Boolean);
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const app = express();
app.use(express.json());

// Ruta pública simple
app.get('/', (req, res) => {
  res.send('Telegram webhook forwarder is running.');
});

// Webhook endpoint (usamos el token en la URL para mayor seguridad)
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  // Validar header de secret token si fue configurado
  if (SECRET_TOKEN) {
    const incoming = req.get('x-telegram-bot-api-secret-token') || req.get('X-Telegram-Bot-Api-Secret-Token');
    if (!incoming || incoming !== SECRET_TOKEN) {
      console.warn('⚠️ Webhook request con secret token inválido');
      return res.sendStatus(401);
    }
  }

  const update = req.body;
  // aceptar y responder rápido para Telegram
  res.sendStatus(200);

  try {
    // mensajes normales
    const msg = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    if (!msg) {
      // otros tipos (callback_query, etc.) -> puedes procesarlos aquí si quieres
      return;
    }

    const fromChatId = msg.chat.id;
    const messageId = msg.message_id;

    console.log(`[${new Date().toISOString()}] Update recibida. chat:${fromChatId} msg_id:${messageId}`);

    // reenvía a todos los destinos configurados
    await Promise.all(FORWARD_CHAT_IDS.map(async targetChatId => {
      try {
        const resp = await axios.post(`${API_URL}/forwardMessage`, {
          chat_id: targetChatId,
          from_chat_id: fromChatId,
          message_id: messageId,
          disable_notification: true
        });
        if (resp.data && resp.data.ok) {
          console.log(`↳ Reenviado a ${targetChatId} (result ok)`);
        } else {
          console.warn(`↳ Falló reenviar a ${targetChatId}:`, resp.data);
        }
      } catch (e) {
        console.error(`↳ Error reenviando a ${targetChatId}:`, e.response?.data || e.message || e);
      }
    }));
  } catch (err) {
    console.error('Error procesando update:', err);
  }
});

// Rutas utiles para setear/quitar webhook desde el navegador / curl
// GET /setWebhook?url=https://mi-app.onrender.com
app.get('/setWebhook', async (req, res) => {
  // url final: por defecto toma BASE_URL + /webhook/BOT_TOKEN, o acepta ?url=
  const publicUrl = req.query.url || (BASE_URL && `${BASE_URL}/webhook/${BOT_TOKEN}`);
  if (!publicUrl) return res.status(400).send('Falta ?url= o la variable BASE_URL.');

  try {
    const payload = { url: publicUrl };
    if (SECRET_TOKEN) payload.secret_token = SECRET_TOKEN;
    const r = await axios.post(`${API_URL}/setWebhook`, payload);
    return res.json(r.data);
  } catch (e) {
    console.error('setWebhook error', e.response?.data || e.message || e);
    return res.status(500).send(e.response?.data || e.message || 'error');
  }
});

app.get('/removeWebhook', async (req, res) => {
  try {
    const r = await axios.post(`${API_URL}/deleteWebhook`);
    return res.json(r.data);
  } catch (e) {
    console.error('deleteWebhook error', e.response?.data || e.message || e);
    return res.status(500).send(e.response?.data || e.message || 'error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`Webhook endpoint: /webhook/${BOT_TOKEN}`);
  console.log(`Forwarding to: ${FORWARD_CHAT_IDS.join(', ')}`);
});