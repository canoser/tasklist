import localforage from 'localforage';

// 1. Veri Önbelleği (Okuma/Read için)
export const cacheStore = localforage.createInstance({
  name: 'PlanlamaApp',
  storeName: 'cache_data'
});

// 2. Çevrimdışı İşlem Kuyruğu (Yazma/Write için)
export const queueStore = localforage.createInstance({
  name: 'PlanlamaApp',
  storeName: 'offline_queue'
});

/**
 * Cache Yönetim Yardımcı Fonksiyonları
 */
export const setCache = async (key, data) => {
  try {
    await cacheStore.setItem(key, data);
  } catch (err) {
    console.error('IDB Cache Set Error:', err);
  }
};

export const getCache = async (key) => {
  try {
    return await cacheStore.getItem(key);
  } catch (err) {
    console.error('IDB Cache Get Error:', err);
    return null;
  }
};

export const removeCache = async (key) => {
  try {
    await cacheStore.removeItem(key);
  } catch (err) {
    console.error('IDB Cache Remove Error:', err);
  }
};

/**
 * Çevrimdışı Kuyruk (Offline Queue) Yardımcı Fonksiyonları
 */
export const addToOfflineQueue = async (action) => {
  try {
    // action: { method: 'POST', url: '/tasks', data: {...}, timestamp: Date.now(), id: uuid }
    const queue = (await queueStore.getItem('sync_queue')) || [];
    queue.push(action);
    await queueStore.setItem('sync_queue', queue);
  } catch (err) {
    console.error('IDB Queue Add Error:', err);
  }
};

export const getOfflineQueue = async () => {
  try {
    return (await queueStore.getItem('sync_queue')) || [];
  } catch (err) {
    console.error('IDB Queue Get Error:', err);
    return [];
  }
};

export const clearOfflineQueue = async () => {
  try {
    await queueStore.setItem('sync_queue', []);
  } catch (err) {
    console.error('IDB Queue Clear Error:', err);
  }
};
