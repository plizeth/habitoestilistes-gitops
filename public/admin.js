const socket = io();
socket.emit('join-admin');

const messages = document.getElementById('adminMessages');
let lastClientId = '';

function addMsg(m) {
  if (m.clientId) {
    lastClientId = m.clientId;
    document.getElementById('clientId').value = m.clientId;
  }
  const d = document.createElement('div');
  d.className = 'msg ' + (m.from === 'admin' ? 'admin' : '');
  d.innerHTML = `<small>${m.clientId || ''}</small><br>
    ${m.from}: ${m.name ? m.name + ': ' : ''}${m.text}`;
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
}

socket.on('chat-message', addMsg);

document.getElementById('adminForm').addEventListener('submit', e => {
  e.preventDefault();
  const clientId = document.getElementById('clientId').value || lastClientId;
  const text = document.getElementById('adminText').value.trim();
  if (!text) return;
  socket.emit('admin-message', { clientId, text });
  document.getElementById('adminText').value = '';
});
