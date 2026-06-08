const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 8080;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const MERGE_DELAY_MS = Number(process.env.MERGE_DELAY_MS || 3500);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

const clientBuffers = new Map();
const latestRequestByClient = new Map();

async function sendToN8n(payload) {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] N8N_WEBHOOK_URL no configurado');
    return null;
  }
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok || !text) return null;
    try { return JSON.parse(text); } catch { return { reply: text }; }
  } catch (err) {
    console.error('[n8n] Error:', err.message);
    return null;
  }
}

function extractReply(data) {
  if (!data) return null;
  return data.reply || data.message || data.output || data.text || data.response || null;
}

io.on('connection', socket => {
  console.log(`[chat] Cliente conectado: ${socket.id}`);

  socket.on('join-admin', () => {
    socket.join('admin');
  });

  socket.on('client-message', msg => {
    const now = new Date().toISOString();
    const conversationId = msg.clientId || socket.id;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    latestRequestByClient.set(conversationId, requestId);

    const incomingMessage = { ...msg, from: 'client', ts: now, clientId: conversationId };
    socket.emit('chat-message', incomingMessage);
    io.to('admin').emit('chat-message', incomingMessage);

    const existing = clientBuffers.get(conversationId) || {
      messages: [], timer: null, name: msg.name || 'Cliente', requestId,
    };
    existing.messages.push({ text: msg.text, ts: now });
    existing.name = msg.name || existing.name;
    existing.requestId = requestId;

    if (existing.timer) clearTimeout(existing.timer);

    existing.timer = setTimeout(async () => {
      const buffer = clientBuffers.get(conversationId);
      if (!buffer || buffer.requestId !== requestId) return;

      const mergedText = buffer.messages.map(m => m.text).filter(Boolean).join('\n');
      clientBuffers.delete(conversationId);

      const payload = {
        name: buffer.name, text: mergedText, messages: buffer.messages,
        from: 'client', ts: new Date().toISOString(), clientId: conversationId,
        requestId, merged: true,
      };

      const n8nResponse = await sendToN8n(payload);
      if (latestRequestByClient.get(conversationId) !== requestId) return;

      const replyText = extractReply(n8nResponse);
      if (!replyText) return;

      const botPayload = {
        name: 'Habito Estilistes', text: replyText, from: 'admin',
        ts: new Date().toISOString(), clientId: conversationId, requestId, source: 'n8n',
      };
      socket.emit('chat-message', botPayload);
      io.to('admin').emit('chat-message', botPayload);
    }, MERGE_DELAY_MS);

    clientBuffers.set(conversationId, existing);
  });

  socket.on('disconnect', () => {
    console.log(`[chat] Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Habito web escuchando en http://localhost:${PORT}`);
});
