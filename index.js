require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const botToken = process.env.BOT_TOKEN;
const forwardChatId = process.env.FORWARD_CHAT_ID;
const apiUrl = `https://api.telegram.org/bot${botToken}`;

// Import dinámico de fetch (para Node 18+)
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Ruta del webhook
app.post(`/webhook/${botToken}`, async (req, res) => {
  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;
    const username = update.message.from.username || update.message.from.first_name;

    console.log(`✅ Nuevo mensaje de @${username}`);

    try {
      // Reenviar mensaje
      await fetch(`${apiUrl}/forwardMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: forwardChatId,
          from_chat_id: chatId,
          message_id: messageId,
          disable_notification: true
        })
      });
      console.log("↳ Reenviado exitosamente ✅");
    } catch (err) {
      console.error("⚠️ Error al reenviar:", err.message);
    }
  }

  res.sendStatus(200);
});

// Puerto dinámico de Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Bot escuchando en puerto ${PORT}`);

  // Configurar webhook en Telegram
  const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook/${botToken}`;
  try {
    const res = await fetch(`${apiUrl}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl })
    });
    const data = await res.json();
    console.log("📡 Webhook configurado:", data);
  } catch (error) {
    console.error("❌ Error al configurar webhook:", error.message);
  }
});
