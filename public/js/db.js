// Local database — all data lives here first, syncs to server when online

const db = new Dexie('LogisticsDB');

db.version(1).stores({
  shipments:  '++id, trackingId, status, origin, destination, partnerId, updatedAt, synced',
  messages:   '++id, roomId, senderId, text, timestamp, synced',
  partners:   '++id, name, role, email, lastSeen',
  syncQueue:  '++id, table, action, payload, createdAt',
});

// Helpers

export async function saveShipment(data) {
  const id = await db.shipments.put({ ...data, updatedAt: Date.now(), synced: 0 });
  await queueSync('shipments', data.id ? 'update' : 'create', { ...data, id });
  return id;
}

export async function getShipments() {
  return db.shipments.orderBy('updatedAt').reverse().toArray();
}

export async function saveMessage(data) {
  const id = await db.messages.put({ ...data, timestamp: Date.now(), synced: 0 });
  await queueSync('messages', 'create', { ...data, id });
  return id;
}

export async function getMessages(roomId) {
  return db.messages.where('roomId').equals(roomId).sortBy('timestamp');
}

export async function getPartners() {
  return db.partners.toArray();
}

export async function queueSync(table, action, payload) {
  return db.syncQueue.add({ table, action, payload, createdAt: Date.now() });
}

export async function flushQueue() {
  const pending = await db.syncQueue.toArray();
  return pending;
}

export async function markSynced(queueIds, table, ids) {
  await db.syncQueue.bulkDelete(queueIds);
  if (table && ids) {
    await db[table].where('id').anyOf(ids).modify({ synced: 1 });
  }
}

export default db;
