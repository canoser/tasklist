/**
 * RoleTagSelect.jsx
 * useTagManager hook'unu roleService fonksiyonlarıyla besleyen ince wrapper.
 * TagSelect (UI) + ConfirmModal (Karar Modalı) bileşenlerini birleştirir.
 *
 * Tasarım kararları:
 *   - useCallback ile stabilize edilmiş fonksiyonlar useTagManager'a geçirilir;
 *     gereksiz re-render ve useEffect döngüsü önlenir.
 *   - Karar Modalı: Görev sayısı > 0 olduğunda açılır.
 *       [Görevleri Tut (Rolsüz Bırak)] → confirmKeepTasks (soft-delete + RoleId=null)
 *       [Görevleri de Tamamen Sil]      → confirmHardDelete (geri alınamaz)
 *   - "Diğer" kategorisi ASLA oluşturulmaz.
 *   - userId null/undefined ise erken dönülür (oturum açılmamış durumu).
 *
 * İleride farklı bir yere taşımak için:
 *   <RoleTagSelect userId={user.uid} /> yeterlidir.
 *   Tüm bağımlılıklar (roleService, useTagManager, TagSelect, ConfirmModal)
 *   bu bileşenin içinde kapalı kalır.
 */

import { useCallback } from 'react';
import useTagManager from '../../hooks/useTagManager';
import roleService from '../../services/roleService';
import TagSelect from '../Common/TagSelect/TagSelect';
import ConfirmModal from '../Common/ConfirmModal/ConfirmModal';
import styles from './RoleTagSelect.module.css';
import { USE_MOCK } from '../../config/featureFlags';
import { useTranslation } from 'react-i18next';


const RoleTagSelect = ({ userId, tone }) => {
  const { t } = useTranslation('profile');
  // MOCK_USER_ID kullanımını kaldırıp her yerin aynı fallback'i (guest) kullanmasını sağlıyoruz
  const effectiveUserId = userId || null;

  // ── Stable Fonksiyonlar (useCallback) ─────────────────────────────────────
  const fetchFn        = useCallback(() => roleService.getActive(effectiveUserId), [effectiveUserId]);
  const addFn          = useCallback((label) => roleService.add(effectiveUserId, label), [effectiveUserId]);
  const softDeleteFn   = useCallback((id) => roleService.softDelete(effectiveUserId, id), [effectiveUserId]);
  const keepTasksFn    = useCallback((id) => roleService.keepTasks(effectiveUserId, id), [effectiveUserId]);
  const hardDeleteFn   = useCallback((id) => roleService.hardDelete(effectiveUserId, id), [effectiveUserId]);
  const getTaskCountFn = useCallback((id) => roleService.getTaskCount(effectiveUserId, id), [effectiveUserId]);

  const tagManager = useTagManager({
    fetchFn,
    addFn,
    softDeleteFn,
    keepTasksFn,
    hardDeleteFn,
    getTaskCountFn,
    entityName: 'rol',
  });

  // ── Oturum açılmamış (sadece API modunda) ────────────────────────────────
  if (!effectiveUserId) {
    return (
      <p className={styles.hint}>
        {t('roles_login_hint', { context: tone })}
      </p>
    );
  }



  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <TagSelect
        tags={tagManager.tags}
        onAdd={tagManager.addTag}
        onRemove={tagManager.requestRemove}
        suggestions={roleService.suggestions}
        placeholder={t('tag_add_placeholder', { ns: 'common', context: tone })}
        isLoading={tagManager.isLoading || tagManager.isCheckingCount || tagManager.isSaving}
        tone={tone}
      />

      {/* ── Karar Modalı ── */}
      <ConfirmModal
        isOpen={!!tagManager.pendingRemoveTag}
        title={`"${tagManager.pendingRemoveTag?.roleName || ''}" rolünü sil`}
        description={
          tagManager.pendingTaskCount > 0
            ? `Bu role ait ${tagManager.pendingTaskCount} adet görev var. Ne yapmak istersiniz?`
            : undefined
        }
        actions={[
          {
            label: 'Görevleri Tut (Rolsüz Bırak)',
            variant: 'warning',
            onClick: tagManager.confirmKeepTasks,
          },
          {
            label: 'Görevleri de Tamamen Sil',
            variant: 'danger',
            onClick: tagManager.confirmHardDelete,
          },
        ]}
        onCancel={tagManager.cancelRemove}
        tone={tone}
      />
    </>
  );
};

export default RoleTagSelect;
