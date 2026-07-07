const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC = path.join(__dirname, '../public');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

// In-memory store — swap for a real DB (SQLite, Postgres, etc.)
const store = { shipments: [], messages: [] };
let idSeq = 1;

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch(e) { reject(e) } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── API routes ──
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    const s = store.shipments;
    return json(res, {
      shipments: s.length,
      inTransit: s.filter(x => x.status === 'in_transit').length,
      delivered: s.filter(x => x.status === 'delivered').length,
      pending:   s.filter(x => x.status === 'pending').length,
    });
  }

  if (url.pathname === '/api/sync' && req.method === 'POST') {
    const queue = await body(req);
    const synced = [];

    for (const item of queue) {
      if (item.table === 'shipments') {
        const record = { ...item.payload, serverId: idSeq++ };
        store.shipments.push(record);
        synced.push({ table: 'shipments', ids: [item.payload.id], queueIds: [item.id] });
      }
      if (item.table === 'messages') {
        const record = { ...item.payload, serverId: idSeq++ };
        store.messages.push(record);
        synced.push({ table: 'messages', ids: [item.payload.id], queueIds: [item.id] });
      }
    }

    return json(res, { synced });
  }

  // ── Static files ──
  let filePath = path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

server.listen(PORT, () => console.log(`Logistics → http://localhost:${PORT}`));
