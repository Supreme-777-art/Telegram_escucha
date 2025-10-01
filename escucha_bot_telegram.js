const botToken = "8300681083:AAEG_sCLMYSHmkzcx0p9gNQhuRJXPA6T0GQ";
const apiUrl = `https://api.telegram.org/bot${botToken}`;
const forwardChatId = "-1003137479084";

let offset = 0;
let isRunning = true;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

async function forwardMessage(chatId, messageId) {
  try {
    const url = `${apiUrl}/forwardMessage`;
    const payload = {
      chat_id: forwardChatId,
      from_chat_id: chatId,
      message_id: messageId,
      disable_notification: true
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error("⚠️ Error al reenviar mensaje:", result.description);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("⚠️ Error en forwardMessage:", error.message);
    return false;
  }
}

async function getUpdates() {
  if (!isRunning) return;

  try {
    const res = await fetch(`${apiUrl}/getUpdates?offset=${offset + 1}&timeout=30`, {
      signal: AbortSignal.timeout(35000)
    });
    
    const data = await res.json();

    if (!data.ok) {
      console.error("❌ Error API:", data.description);
      await sleep(2000);
      return getUpdates();
    }

    reconnectAttempts = 0;

    if (data.result && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id;
        
        if (update.message) {
          const chatId = update.message.chat.id;
          const messageId = update.message.message_id;
          const username = update.message.from.username || update.message.from.first_name;
          const messageType = getMessageType(update.message);

          console.log(`✅ [${new Date().toLocaleTimeString()}] Nuevo ${messageType} de @${username}`);

          const forwarded = await forwardMessage(chatId, messageId);
          
          if (forwarded) {
            console.log("   ↳ Reenviado exitosamente");
          }
        }
      }
    }

    setImmediate(getUpdates);

  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log("⏱️ Timeout - Reconectando...");
      setImmediate(getUpdates);
    } else {
      console.error("❌ Error:", error.message);
      
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error("💀 Máximo de reintentos alcanzado. Deteniendo bot.");
        isRunning = false;
        return;
      }
      
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`🔄 Reintentando en ${delay/1000}s... (Intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      await sleep(delay);
      getUpdates();
    }
  }
}

function getMessageType(message) {
  if (message.text) return "mensaje";
  if (message.photo) return "foto";
  if (message.video) return "video";
  if (message.document) return "documento";
  if (message.audio) return "audio";
  if (message.voice) return "nota de voz";
  if (message.sticker) return "sticker";
  if (message.animation) return "GIF";
  if (message.location) return "ubicación";
  if (message.contact) return "contacto";
  return "contenido";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('SIGINT', () => {
  console.log("\n🛑 Bot detenido por el usuario");
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n🛑 Bot detenido");
  isRunning = false;
  process.exit(0);
});

console.log("🚀 Bot iniciado - Escuchando mensajes...");
console.log(`📡 Reenviando a: ${forwardChatId}`);
console.log("━".repeat(50));

getUpdates();