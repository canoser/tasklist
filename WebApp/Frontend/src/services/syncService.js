import apiClient from './apiClient';
import { getOfflineQueue, clearOfflineQueue } from '../utils/indexedDB';
import localforage from 'localforage';

export const processOfflineQueue = async () => {
  // [MOBILE_PORT_TODO]: navigator.onLine iOS WebView'de (Capacitor) her zaman doğru çalışmaz.
  // @capacitor/network eklentisi (Network.getStatus()) ile değiştirilmeli.
  if (!navigator.onLine) return;

  const queue = await getOfflineQueue();
  if (!queue || queue.length === 0) return;

  console.log(`[SyncService] İnternet geldi. Çevrimdışı kuyruktaki ${queue.length} işlem arka planda senkronize ediliyor...`);

  let successCount = 0;
  const failedActions = [];

  for (const action of queue) {
    try {
      if (action.type === 'POST') {
        await apiClient.post(action.url, action.data);
      } else if (action.type === 'PUT') {
        await apiClient.put(action.url, action.data);
      } else if (action.type === 'PATCH') {
        await apiClient.patch(action.url, action.data);
      } else if (action.type === 'DELETE') {
        await apiClient.delete(action.url);
      }
      successCount++;
    } catch (err) {
      console.warn(`[SyncService] İşlem senkronize edilemedi: ${action.type} ${action.url}`, err);
      failedActions.push(action);
    }
  }

  if (failedActions.length === 0) {
    await clearOfflineQueue();
    console.log(`[SyncService] ✅ Tüm işlemler başarıyla buluta aktarıldı.`);
  } else {
    console.warn(`[SyncService] ⚠️ Bazı işlemler senkronize edilemedi. Kuyrukta bekletiliyor.`);
    const queueStore = localforage.createInstance({
      name: 'PlanlamaApp',
      storeName: 'offline_queue'
    });
    await queueStore.setItem('sync_queue', failedActions);
  }
};

export const startSyncListener = () => {
  if (navigator.onLine) {
    processOfflineQueue();
  }

  // [MOBILE_PORT_TODO]: window.addEventListener('online') mobilde güvenilmezdir.
  // Network.addListener('networkStatusChange', status => ...) kullanılmalı.
  window.addEventListener('online', () => {
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    console.warn('[SyncService] 📶 İnternet bağlantısı koptu. Çevrimdışı (Offline) moda geçildi. Yapılan işlemler kuyruğa alınacak.');
  });
};
