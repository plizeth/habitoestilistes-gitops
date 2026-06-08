document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  let habitoClientId = localStorage.getItem('habitoClientId');
  if (!habitoClientId) {
    habitoClientId = crypto.randomUUID();
    localStorage.setItem('habitoClientId', habitoClientId);
  }

  const chatToggle = document.getElementById('chatToggle');
  const chatBox = document.getElementById('chatBox');
  const chatClose = document.getElementById('chatClose');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('text');
  const chatMessages = document.getElementById('messages');
  const clientName = document.getElementById('name');

  if (!chatToggle || !chatBox) return;

  chatToggle.addEventListener('click', () => {
    chatBox.classList.toggle('open');
  });

  if (chatClose) {
    chatClose.addEventListener('click', () => {
      chatBox.classList.remove('open');
    });
  }

  function addMessage(name, text, type = 'client') {
    const div = document.createElement('div');
    div.className = `msg ${type === 'admin' ? 'admin' : ''}`;
    div.innerHTML = `<strong>${name}:</strong> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    const name = clientName.value.trim() || 'Cliente';
    if (!text) return;
    socket.emit('client-message', { name, text, clientId: habitoClientId });
    chatInput.value = '';
  });

  socket.on('chat-message', msg => {
    addMessage(
      msg.name || 'Habito Estilistes',
      msg.text || '',
      msg.from === 'admin' ? 'admin' : 'client'
    );
  });
});
