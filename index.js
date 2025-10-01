import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const botToken = process.env.BOT_TOKEN;
const serverUrl = process.env.RENDER_EXTERNAL_URL;
const apiUrl = `https://api.telegram.org/bot${botToken}`;
const forwardChatId = "-1003137479084"; // tu grupo/canal

// Configura el webhook al iniciar
async function setWebhook() {
  try {
    const res = await fetch(`${apiUrl}/setWebhook?url=${serverUrl}/webhook`, {
      method: "GET",
    });
    const data = await res.json();
    console.log("📡 Webhook configurado:", data);
  } catch (error) {
    console.error("❌ Error configurando webhook:", error.message);
  }
}

// Endpoint que recibe mensajes de Telegram
app.post("/webhook", async (req, res) => {
  const update = req.body;

  console.log("📩 Update recibido:", JSON.stringify(update, null, 2));

  if (update.message) {
    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;

    console.log("✅ Nuevo mensaje detectado de:", chatId);

    try {
      const response = await fetch(`${apiUrl}/forwardMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: forwardChatId,
          from_chat_id: chatId,
          message_id: messageId,
        }),
      });

      const result = await response.json();
      if (result.ok) {
        console.log("↳ Reenviado con éxito");
      } else {
        console.error("⚠️ Error al reenviar:", result);
      }
    } catch (err) {
      console.error("⚠️ Error al reenviar:", err.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot escuchando en puerto ${PORT}`);
  setWebhook();
});
