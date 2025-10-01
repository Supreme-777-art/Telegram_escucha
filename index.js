import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Variables desde Render
const botToken = process.env.BOT_TOKEN;
const serverUrl = process.env.RENDER_EXTERNAL_URL;

const apiUrl = `https://api.telegram.org/bot${botToken}`;

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

  if (update.message) {
    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;

    console.log("✅ Nuevo mensaje:", update.message.text || "otro tipo");

    // Aquí reenvía el mensaje al grupo/canal
    const forwardChatId = "-1003137479084"; // tu grupo
    try {
      await fetch(`${apiUrl}/forwardMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: forwardChatId,
          from_chat_id: chatId,
          message_id: messageId,
        }),
      });
      console.log("↳ Reenviado con éxito");
    } catch (err) {
      console.error("⚠️ Error al reenviar:", err.message);
    }
  }

  res.sendStatus(200);
});

// Render usa un puerto asignado automáticamente
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot escuchando en puerto ${PORT}`);
  setWebhook();
});
