import { useState, useEffect } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon } from '../Common/Icons';
import { taskService } from '../../services/taskService';
import { useTranslation } from 'react-i18next';
import { useTaskContext } from '../../context/TaskContext';
import chainService from '../../services/chainService';
import HierarchicalCategoryPicker from '../Category/HierarchicalCategoryPicker';
import styles from './AddTaskModal.module.css';

// ── DayDetailModal'ın aynı mimarisi: BaseModal'a sadece isOpen + onClose geçer.
// Header, close butonu ve body tamamen bu bileşenin içinde çizilir.
// Hiçbir useEffect, onFullyClosed, visibility, inert yoktur.

const AddTaskModal = ({ isOpen, onClose, tone }) => {
  const { t } = useTranslation('tasks');
  const { notifyTaskAdded } = useTaskContext();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isChain, setIsChain] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState('');
  const [chains, setChains] = useState([]);
  const [loadingChains, setLoadingChains] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isChain && chains.length === 0) {
      setLoadingChains(true);
      chainService.getChains().then(data => {
        setChains(data || []);
        setLoadingChains(false);
      });
    }
  }, [isChain]);

  const handleManualClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!title) return;
    setLoading(true);

    const metadata = scheduledTime
      ? JSON.stringify({ hasScheduledTime: true, scheduledTime })
      : null;

    const newTask = {
      id: Date.now(),
      title,
      categoryId,
      chainId: isChain && selectedChainId ? selectedChainId : undefined,
      taskType: 'Görev',
      deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
      isTeacherAssigned: false,
      isCompleted: false,
      color: 'Blue',
      metadata,
    };

    try {
      await taskService.create(newTask);
    } catch (err) {
      console.warn('API isteği başarısız, offline görev olarak ekleniyor:', err);
    } finally {
      setLoading(false);
      notifyTaskAdded(newTask);
      setTitle('');
      setCategoryId(null);
      setDeadline('');
      setScheduledTime('');
      setIsChain(false);
      setSelectedChainId('');
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleManualClose}>
      <>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitle}>
              {t('modal_title', { context: tone })}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={handleManualClose}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.modalBody}>
          <input
            type="text"
            className={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('field_title_placeholder', { context: tone })}
            disabled={loading}
          />

          <div className={styles.detailsGroup}>
            <div className={styles.rowCategory}>
              <div className={styles.rowLabel}>
                <span className={styles.icon}>🏷️</span>
                {t('field_category', { context: tone, defaultValue: 'Kategori' })}
              </div>
              <div className={styles.categoryPickerWrapper}>
                <HierarchicalCategoryPicker
                  value={categoryId}
                  onChange={id => setCategoryId(id)}
                />
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.row}>
              <div className={styles.rowLabel}>
                <span className={styles.icon}>📅</span>
                {t('field_date', { context: tone })}
              </div>
              <input
                type="date"
                className={styles.rowInput}
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.row}>
              <div className={styles.rowLabel}>
                <span className={styles.icon}>🕐</span>
                Saat
              </div>
              <input
                type="time"
                className={styles.rowInput}
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.row}>
              <div
                className={styles.rowLabel}
                style={{ cursor: 'pointer' }}
                onClick={() => setIsChain(!isChain)}
              >
                <span className={styles.icon}>🔗</span>
                Zincir Görevi
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={isChain}
                  onChange={e => setIsChain(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  disabled={loading}
                />
                {isChain && (
                  <select
                    className={styles.rowInput}
                    value={selectedChainId}
                    onChange={e => setSelectedChainId(e.target.value)}
                    disabled={loading || loadingChains}
                    style={{ width: '140px', padding: '6px', textAlign: 'left' }}
                  >
                    <option value="">{loadingChains ? 'Yükleniyor...' : 'Zincir Seçin'}</option>
                    {chains.map(ch => {
                      const chainName =
                        ch.tasks && ch.tasks.length > 0
                          ? ch.tasks[0].title + ' Zinciri'
                          : ch.chainId;
                      return (
                        <option key={ch.chainId} value={ch.chainId}>
                          {chainName}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>
          </div>

          <button
            className={styles.submitBtn}
            onClick={handleSave}
            disabled={!title || loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              t('btn_submit', { context: tone })
            )}
          </button>
        </div>
      </>
    </BaseModal>
  );
};

export default AddTaskModal;
