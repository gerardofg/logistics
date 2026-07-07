import { saveShipment, getShipments, saveMessage, getMessages } from './db.js';
import { syncNow, registerBackgroundSync } from './sync.js';

// ── Service worker registration ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => registerBackgroundSync());
}

// ── Navigation ──
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('nav ul a');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.view;
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    views.forEach(v => v.classList.toggle('active', v.id === `view-${target}`));
    if (target === 'shipments') renderShipments();
    if (target === 'messages') renderMessages(currentRoom);
    if (target === 'dashboard') renderDashboard();
  });
});

// ── Connectivity badge ──
const badge = document.getElementById('status-badge');
function updateBadge() {
  badge.textContent = navigator.onLine ? 'Online' : 'Offline';
  badge.className = `badge ${navigator.onLine ? 'online' : 'offline'}`;
}
updateBadge();
window.addEventListener('connectivity:online', updateBadge);
window.addEventListener('connectivity:offline', updateBadge);

// ── Sync status ──
const syncStatus = document.getElementById('sync-status');
window.addEventListener('sync:complete', e => {
  syncStatus.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
});

// ── Dashboard ──
async function renderDashboard() {
  const shipments = await getShipments();
  document.getElementById('stat-total').textContent = shipments.length;
  document.getElementById('stat-transit').textContent = shipments.filter(s => s.status === 'in_transit').length;
  document.getElementById('stat-delivered').textContent = shipments.filter(s => s.status === 'delivered').length;
  document.getElementById('stat-pending').textContent = shipments.filter(s => s.status === 'pending').length;
}

// ── Shipments ──
const form = document.getElementById('shipment-form');
document.getElementById('btn-new-shipment').addEventListener('click', () => form.classList.remove('hidden'));
document.getElementById('btn-cancel-shipment').addEventListener('click', () => form.classList.add('hidden'));

document.getElementById('btn-save-shipment').addEventListener('click', async () => {
  const data = {
    trackingId:  document.getElementById('f-tracking').value.trim(),
    origin:      document.getElementById('f-origin').value.trim(),
    destination: document.getElementById('f-destination').value.trim(),
    status:      document.getElementById('f-status').value,
    partnerId:   'me',
  };
  if (!data.trackingId) return;
  await saveShipment(data);
  form.classList.add('hidden');
  ['f-tracking','f-origin','f-destination'].forEach(id => document.getElementById(id).value = '');
  await renderShipments();
  if (navigator.onLine) syncNow();
});

async function renderShipments() {
  const rows = await getShipments();
  const tbody = document.getElementById('shipments-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No shipments yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(s => `
    <tr>
      <td>${s.trackingId}</td>
      <td>${s.origin}</td>
      <td>${s.destination}</td>
      <td><span class="pill ${s.status}">${s.status.replace('_', ' ')}</span></td>
      <td><span class="pill ${s.synced ? 'synced' : 'unsynced'}">${s.synced ? 'Synced' : 'Pending'}</span></td>
    </tr>
  `).join('');
}

// ── Messages ──
let currentRoom = 'general';

document.querySelectorAll('.room').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.room').forEach(r => r.classList.remove('active'));
    el.classList.add('active');
    currentRoom = el.dataset.room;
    renderMessages(currentRoom);
  });
});

document.getElementById('btn-send').addEventListener('click', sendMessage);
document.getElementById('msg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  await saveMessage({ roomId: currentRoom, senderId: 'me', text });
  input.value = '';
  await renderMessages(currentRoom);
  if (navigator.onLine) syncNow();
}

async function renderMessages(roomId) {
  const msgs = await getMessages(roomId);
  const container = document.getElementById('chat-messages');
  if (!msgs.length) {
    container.innerHTML = '<p style="color:var(--muted);text-align:center;margin-top:2rem">No messages yet. Say hello!</p>';
    return;
  }
  container.innerHTML = msgs.map(m => `
    <div class="msg ${m.senderId === 'me' ? 'mine' : 'theirs'}">
      <div class="bubble">${m.text}</div>
      <div class="meta">${new Date(m.timestamp).toLocaleTimeString()}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

// ── Boot ──
renderDashboard();
