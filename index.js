const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

const botToken = process.env.BOT_TOKEN;
const apiUrl = `https://api.telegram.org/bot${botToken}`;

// Ruta del webhook
app.post(`/webhook/${botToken}`, async (req, res) => {
  const message = req.body.message;
  console.log("📩 Mensaje recibido:", message);
  res.sendStatus(200);
});

// Servidor en Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Bot escuchando en puerto ${PORT}`);

  const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook/${botToken}`;
  const response = await fetch(`${apiUrl}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const data = await response.json();
  console.log("📡 Webhook configurado:", data);
});
