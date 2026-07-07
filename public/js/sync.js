// Sync engine — pushes the local queue to the server when online

import { flushQueue, markSynced } from './db.js';

let syncing = false;

export async function syncNow() {
  if (syncing || !navigator.onLine) return;
  syncing = true;

  try {
    const queue = await flushQueue();
    if (!queue.length) return;

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queue),
    });

    if (!res.ok) throw new Error('Sync failed');

    const { synced } = await res.json();
    for (const { table, ids, queueIds } of synced) {
      await markSynced(queueIds, table, ids);
    }

    dispatchEvent(new CustomEvent('sync:complete', { detail: { count: synced.length } }));
  } catch (err) {
    console.warn('Sync deferred:', err.message);
  } finally {
    syncing = false;
  }
}

// Register background sync via service worker
export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-queue');
  }
}

// Listen for SW-triggered sync (fires when SW gets the sync event)
navigator.serviceWorker?.addEventListener('message', e => {
  if (e.data?.type === 'sync') syncNow();
});

// Also sync on network recovery
window.addEventListener('online', () => {
  syncNow();
  dispatchEvent(new CustomEvent('connectivity:online'));
});

window.addEventListener('offline', () => {
  dispatchEvent(new CustomEvent('connectivity:offline'));
});
