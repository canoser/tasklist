/**
 * useTagManager.js
 * Herhangi bir "tag" (etiket, rol, yetkinlik vb.) için genel durum yöneticisi.
 *
 * Veri tipini bilmez — fonksiyon enjeksiyonu (dependency injection) ile çalışır.
 * Bugün roller için kullanılır; yarın proje etiketleri, yetkinlikler vb. için de
 * aynı hook kullanılır. Tek kaynak, sıfır tekrar (DRY).
 *
 * "Karar Modalı" akışı:
 *   requestRemove(tag)
 *     → getTaskCountFn(tag.id)
 *       count=0 → softDeleteFn + UndoSnackbar (5 sn geri alınabilir)
 *       count>0 → pendingRemoveTag set, modal açılır
 *                  [Görevleri Tut (Rolsüz Bırak)] → confirmKeepTasks → keepTasksFn + UndoSnackbar
 *                  [Görevleri de Tamamen Sil]      → confirmHardDelete → hardDeleteFn (geri alınamaz)
 *
 * Props:
 *   fetchFn        () => Promise<tag[]>        İlk yüklemede çağrılır
 *   addFn          (label) => Promise<tag>     Yeni tag ekler veya restore eder
 *   softDeleteFn   (id) => Promise<bool>       Soft-delete (görev yoksa)
 *   keepTasksFn    (id) => Promise<bool>       Soft-delete + görevleri rolsüz bırak
 *   hardDeleteFn   (id) => Promise<bool>       Hard-delete (geri alınamaz)
 *   getTaskCountFn (id) => Promise<number>     Bağlı görev sayısı
 *   entityName     string                      "rol", "etiket" vb. (snackbar metni için)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUndo } from '../components/Common/UndoContext';

const useTagManager = ({
  fetchFn,
  addFn,
  softDeleteFn,
  keepTasksFn,
  hardDeleteFn,
  getTaskCountFn,
  entityName = 'eleman',
}) => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingCount, setIsCheckingCount] = useState(false);

  // Karar Modalı için bekleyen silme
  const [pendingRemoveTag, setPendingRemoveTag] = useState(null);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);

  const { triggerUndoableAction } = useUndo();

  // Fonksiyonları ref'lerde tut — useEffect/useCallback'lerin bağımlılık döngüsünü önler.
  // RoleTagSelect her render'da yeni arrow function oluştursa bile hook stabil kalır.
  const fnRef = useRef({ fetchFn, addFn, softDeleteFn, keepTasksFn, hardDeleteFn, getTaskCountFn });
  useEffect(() => {
    fnRef.current = { fetchFn, addFn, softDeleteFn, keepTasksFn, hardDeleteFn, getTaskCountFn };
  });

  // ── İlk Yükleme ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fnRef.current
      .fetchFn()
      .then((data) => { if (!cancelled) setTags(data || []); })
      .catch((err) => console.error('[useTagManager] fetchFn hatası:', err))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []); // Sadece mount'ta — fnRef sayesinde eski fonksiyon kullanılmaz

  // ── Tag Ekleme ────────────────────────────────────────────────────────────
  const addTag = useCallback(async (label) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    // Aktif listede aynı isimde tag varsa ekleme (case-insensitive)
    const alreadyActive = tags.some(
      (t) => (t.roleName || t.label || '').toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyActive) return;

    setIsSaving(true);
    try {
      const newTag = await fnRef.current.addFn(trimmed);
      setTags((prev) => [...prev, newTag]);
    } catch (err) {
      console.error('[useTagManager] addFn hatası:', err);
    } finally {
      setIsSaving(false);
    }
  }, [tags]);

  // ── Tag Silme İsteği (Karar Noktası) ─────────────────────────────────────
  /**
   * Kullanıcı × butonuna bastığında çağrılır.
   * Görev sayısını kontrol eder:
   *   count = 0 → Doğrudan soft-delete + UndoSnackbar
   *   count > 0 → Karar Modalı açılır
   */
  const requestRemove = useCallback(async (tag) => {
    setIsCheckingCount(true);
    try {
      const count = await fnRef.current.getTaskCountFn(tag.id);

      if (count === 0) {
        // Optimistic UI: Tag'i hemen kaldır
        setTags((prev) => prev.filter((t) => t.id !== tag.id));

        triggerUndoableAction(
          `"${tag.roleName || tag.label}" ${entityName}ü silindi`,
          () => {}, // Optimistic update zaten yapıldı
          async () => { await fnRef.current.softDeleteFn(tag.id); },
          async () => { setTags((prev) => [...prev, tag]); } // Geri al
        );
      } else {
        // Karar Modalı için state set et
        setPendingRemoveTag(tag);
        setPendingTaskCount(count);
      }
    } catch (err) {
      console.error('[useTagManager] getTaskCountFn hatası:', err);
    } finally {
      setIsCheckingCount(false);
    }
  }, [tags, entityName, triggerUndoableAction]);

  // ── "Görevleri Tut (Rolsüz Bırak)" ──────────────────────────────────────
  /**
   * Karar Modalı'nda ilk seçenek seçilince çağrılır.
   * Soft-delete + TaskAssignment.RoleId = null (keepTasksFn).
   * UndoSnackbar ile 5 sn geri alınabilir.
   */
  const confirmKeepTasks = useCallback(async () => {
    if (!pendingRemoveTag) return;
    const tag = pendingRemoveTag;
    setPendingRemoveTag(null);
    setPendingTaskCount(0);

    // Optimistic UI
    setTags((prev) => prev.filter((t) => t.id !== tag.id));

    triggerUndoableAction(
      `"${tag.roleName || tag.label}" silindi, görevler rolsüz bırakıldı`,
      () => {},
      async () => { await fnRef.current.keepTasksFn(tag.id); },
      async () => { setTags((prev) => [...prev, tag]); } // Geri al
    );
  }, [pendingRemoveTag, triggerUndoableAction]);

  // ── "Görevleri de Tamamen Sil" ────────────────────────────────────────────
  /**
   * Karar Modalı'nda ikinci seçenek seçilince çağrılır.
   * Hard-delete: Geri alınamaz. Snackbar gösterilmez.
   */
  const confirmHardDelete = useCallback(async () => {
    if (!pendingRemoveTag) return;
    const tag = pendingRemoveTag;
    setPendingRemoveTag(null);
    setPendingTaskCount(0);

    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    setIsSaving(true);
    try {
      await fnRef.current.hardDeleteFn(tag.id);
    } catch (err) {
      console.error('[useTagManager] hardDeleteFn hatası:', err);
      setTags((prev) => [...prev, tag]); // Hata durumunda rollback
    } finally {
      setIsSaving(false);
    }
  }, [pendingRemoveTag]);

  // ── Modal İptal ───────────────────────────────────────────────────────────
  const cancelRemove = useCallback(() => {
    setPendingRemoveTag(null);
    setPendingTaskCount(0);
  }, []);

  return {
    tags,
    isLoading,
    isSaving,
    isCheckingCount,
    pendingRemoveTag,
    pendingTaskCount,
    addTag,
    requestRemove,
    confirmKeepTasks,
    confirmHardDelete,
    cancelRemove,
  };
};

export default useTagManager;
