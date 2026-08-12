/**
 * roleService.js
 * Kullanıcı rol yönetimi için çift modlu servis (Mock + API).
 *
 * USE_MOCK=true  → localStorage üzerinden çalışır. Backend gereksiz.
 * USE_MOCK=false → Axios (apiClient) üzerinden gerçek endpoint'leri çağırır.
 *
 * Canlıya geçiş: featureFlags.js'de USE_MOCK=false yapılır, başka hiçbir
 * dosyaya dokunulmaz.
 *
 * Soft-delete semantiği (mock):
 *   Silinmiş roller isActive:false olarak localStorage'da tutulur.
 *   Aynı isimde rol tekrar eklenirse → restore (ID aynı kalır).
 *   Bu sayede TaskAssignment.roleId referansları asla orphan kalmaz.
 *
 * "Görevleri Tut (Rolsüz Bırak)":
 *   keepTasks(userId, roleId) → softDelete + mockTaskCount=0 (gerçek API: RemoveRoleFromAssignmentsAsync)
 *   "Diğer" kategorisi ASLA oluşturulmaz.
 */

import apiClient from './apiClient';
import { USE_MOCK } from '../config/featureFlags';

// ── Sabitler ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = (userId) => `planlama_roles_v2_${userId || 'guest'}`;
let _nextMockId = 100;

/**
 * Demo amaçlı: Bu rollere ait görev sayısı > 0 olarak seeding yapılır,
 * böylece "Karar Modalı" ilk açılışta test edilebilir.
 */
const SEED_ROLES = [];

const DEFAULT_SUGGESTIONS = [
  'Öğrenci', 'Öğretmen', 'Ebeveyn', 'Mentor', 'Proje Yöneticisi',
  'Antrenör', 'Sporcu', 'Çalışan', 'Patron', 'Danışman',
];

// ── Mock: localStorage yardımcıları ──────────────────────────────────────────

const _getStorage = (userId) => {
  const raw = localStorage.getItem(STORAGE_KEY(userId));
  if (raw) return JSON.parse(raw);
  // İlk erişimde seed verisi oluştur
  const seed = SEED_ROLES.map((r) => ({ ...r, createdAt: new Date().toISOString() }));
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(seed));
  return seed;
};

const _setStorage = (userId, roles) => {
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(roles));
};

// ── Mock Implementasyonları ───────────────────────────────────────────────────

const mockService = {
  /** Aktif rolleri döner. */
  getActive: (userId) => {
    const roles = _getStorage(userId);
    return Promise.resolve(roles.filter((r) => r.isActive));
  },

  /**
   * Rol ekler. Aynı isimde soft-deleted kayıt varsa restore eder (ID aynı kalır).
   * Yeni ise oluşturur. Her iki durumda da role nesnesini döner.
   */
  add: (userId, roleName) => {
    const roles = _getStorage(userId);
    const existing = roles.find(
      (r) => r.roleName.toLowerCase() === roleName.toLowerCase() && !r.isActive
    );
    if (existing) {
      existing.isActive = true;
      existing.deletedAt = null;
      _setStorage(userId, roles);
      return Promise.resolve({ ...existing });
    }
    const newRole = {
      id: _nextMockId++,
      roleName,
      isActive: true,
      deletedAt: null,
      _mockTaskCount: 0,
      createdAt: new Date().toISOString(),
    };
    roles.push(newRole);
    _setStorage(userId, roles);
    return Promise.resolve({ ...newRole });
  },

  /** Bir role bağlı görev sayısını döner (Karar Modalı için). */
  getTaskCount: (userId, roleId) => {
    const roles = _getStorage(userId);
    const role = roles.find((r) => r.id === roleId);
    return Promise.resolve(role?._mockTaskCount ?? 0);
  },

  /** Soft-delete: isActive=false. Görevler ve ID korunur. */
  softDelete: (userId, roleId) => {
    const roles = _getStorage(userId);
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      role.isActive = false;
      role.deletedAt = new Date().toISOString();
    }
    _setStorage(userId, roles);
    return Promise.resolve(true);
  },

  /**
   * "Görevleri Tut (Rolsüz Bırak)": Soft-delete + görev sayısını sıfırla.
   * Gerçek API'de: SoftDeleteTagAsync + RemoveRoleFromAssignmentsAsync çağrılır.
   * "Diğer" kategorisi OLUŞTURULMAZ.
   */
  keepTasks: (userId, roleId) => {
    const roles = _getStorage(userId);
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      role.isActive = false;
      role.deletedAt = new Date().toISOString();
      role._mockTaskCount = 0; // Görevlerin rolsüz olduğunu simüle eder
    }
    _setStorage(userId, roles);
    return Promise.resolve(true);
  },

  /** Hard-delete: Kaydı localStorage'dan tamamen kaldırır. */
  hardDelete: (userId, roleId) => {
    const roles = _getStorage(userId);
    _setStorage(userId, roles.filter((r) => r.id !== roleId));
    return Promise.resolve(true);
  },

  /** Soft-deleted rolü geri getirir. */
  restore: (userId, roleId) => {
    const roles = _getStorage(userId);
    const role = roles.find((r) => r.id === roleId);
    if (role) { role.isActive = true; role.deletedAt = null; }
    _setStorage(userId, roles);
    return Promise.resolve(true);
  },
};

// ── API Implementasyonları (Backend hazır olduğunda) ─────────────────────────

const apiService = {
  getActive: async (userId) => {
    const res = await apiClient.get(`/users/${userId}/roles`);
    return res.data;
  },
  add: async (userId, roleName) => {
    const res = await apiClient.post(`/users/${userId}/roles`, { roleName });
    return res.data;
  },
  getTaskCount: async (_userId, roleId) => {
    const res = await apiClient.get(`/users/roles/${roleId}/task-count`);
    return res.data.count;
  },
  softDelete: async (_userId, roleId) => {
    await apiClient.delete(`/users/roles/${roleId}?mode=soft`);
    return true;
  },
  keepTasks: async (_userId, roleId) => {
    // mode=soft: SoftDelete + RemoveRoleFromAssignmentsAsync (backend tek uçta birleşik)
    await apiClient.delete(`/users/roles/${roleId}?mode=soft`);
    return true;
  },
  hardDelete: async (_userId, roleId) => {
    await apiClient.delete(`/users/roles/${roleId}?mode=hard`);
    return true;
  },
  restore: async (_userId, roleId) => {
    await apiClient.patch(`/users/roles/${roleId}/restore`);
    return true;
  },
};

// ── Dışa Açık Servis (USE_MOCK geçişi) ───────────────────────────────────────

// Dinamik implementasyon seçici:
// Eğer genel USE_MOCK aktifse veya kullanıcı giriş yapmamışsa (misafir modu - !userId) mockService kullan.
// Aksi takdirde (gerçek oturum açılmışsa) apiService kullan.
const getImpl = (userId) => (USE_MOCK || !userId) ? mockService : apiService;

export const roleService = {
  /** Kullanıcının aktif rollerini getirir. */
  getActive: (userId) => getImpl(userId).getActive(userId),

  /** Rol ekler veya restore eder. Oluşturulan/restore edilen rolü döner. */
  add: (userId, roleName) => getImpl(userId).add(userId, roleName),

  /** Bir role bağlı görev sayısını döner. Karar Modalı için kullanılır. */
  getTaskCount: (userId, roleId) => getImpl(userId).getTaskCount(userId, roleId),

  /** Soft-delete (görev yoksa doğrudan bu çağrılır). */
  softDelete: (userId, roleId) => getImpl(userId).softDelete(userId, roleId),

  /** "Görevleri Tut (Rolsüz Bırak)": Soft-delete + TaskAssignment.RoleId = null. */
  keepTasks: (userId, roleId) => getImpl(userId).keepTasks(userId, roleId),

  /** "Görevleri de Tamamen Sil": Hard-delete (geri alınamaz). */
  hardDelete: (userId, roleId) => getImpl(userId).hardDelete(userId, roleId),

  /** Restore: Soft-deleted rolü geri getirir. */
  restore: (userId, roleId) => getImpl(userId).restore(userId, roleId),

  /** Öneri listesi — UI bileşenlerine beslenecek sabit roller. */
  suggestions: DEFAULT_SUGGESTIONS,
};

export default roleService;
