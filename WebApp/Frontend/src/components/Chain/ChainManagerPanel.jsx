import React, { useState, useEffect } from 'react';
import chainService from '../../services/chainService';
import HierarchicalCategoryPicker from '../Category/HierarchicalCategoryPicker';
import styles from './ChainManagerPanel.module.css';
import { useTranslation } from 'react-i18next';

const ChainManagerPanel = ({ user }) => {
  const { t } = useTranslation('common');
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedChainId, setExpandedChainId] = useState(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChainTasks, setNewChainTasks] = useState([
    { title: '', deadline: '', categoryId: null }
  ]);
  const [creating, setCreating] = useState(false);

  const loadChains = async () => {
    setLoading(true);
    try {
      const data = await chainService.getChains();
      setChains(data);
    } catch (err) {
      console.error('Zincirler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadChains();
    }
  }, [user]);

  const toggleChain = (chainId) => {
    setExpandedChainId(prev => prev === chainId ? null : chainId);
  };

  const addStep = () => {
    setNewChainTasks([...newChainTasks, { title: '', deadline: '', categoryId: null }]);
  };

  const updateStep = (index, field, value) => {
    const updated = [...newChainTasks];
    updated[index][field] = value;
    setNewChainTasks(updated);
  };

  const removeStep = (index) => {
    const updated = newChainTasks.filter((_, i) => i !== index);
    setNewChainTasks(updated);
  };

  const moveStep = (index, dir) => {
    if (index + dir < 0 || index + dir >= newChainTasks.length) return;
    const updated = [...newChainTasks];
    const temp = updated[index];
    updated[index] = updated[index + dir];
    updated[index + dir] = temp;
    setNewChainTasks(updated);
  };

  const handleCreateChain = async (e) => {
    e.preventDefault();
    if (newChainTasks.some(t => !t.title.trim() || !t.deadline)) {
      alert(t('alert_chain_fill_fields', { defaultValue: 'Lütfen tüm adımların başlığını ve hedeflenen tarihini doldurun.' }));
      return;
    }
    
    setCreating(true);
    try {
      // API'ye gönderilecek formatı hazırla
      const tasksToCreate = newChainTasks.map(t => ({
        ...t,
        deadline: new Date(t.deadline).toISOString(),
        taskType: 'Default' // default task tipini ekle
      }));

      await chainService.createChain(tasksToCreate);
      setNewChainTasks([{ title: '', deadline: '', categoryId: null }]);
      setShowCreateForm(false);
      loadChains();
      window.dispatchEvent(new Event('chainsUpdated'));
    } catch (err) {
      console.error('Zincir oluşturulamadı:', err);
      alert(t('alert_chain_create_error', { defaultValue: 'Zincir oluşturulamadı. Detaylar için konsola bakın.' }));
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 style={{ margin: 0 }}>{t('chain_management', { defaultValue: 'Zincir Görevler' })}</h3>
        <button 
          className={styles.primaryBtn} 
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? t('btn_cancel', { defaultValue: 'İptal' }) : `＋ ${t('btn_new_chain', { defaultValue: 'Yeni Zincir' })}`}
        </button>
      </div>

      {showCreateForm && (
        <form className={styles.createForm} onSubmit={handleCreateChain}>
          <h4 style={{ margin: '0 0 12px 0' }}>{t('new_chain_title', { defaultValue: 'Yeni Görev Zinciri' })}</h4>
          
          {newChainTasks.map((step, index) => (
            <div key={index} className={styles.stepRow}>
              <span style={{ minWidth: '20px', fontWeight: 600 }}>{index + 1}.</span>
              <input
                type="text"
                className={styles.stepInput}
                placeholder={t('placeholder_task_title', { defaultValue: 'Görev Başlığı' })}
                value={step.title}
                onChange={(e) => updateStep(index, 'title', e.target.value)}
                required
              />
              <input
                type="date"
                className={styles.stepDateInput}
                value={step.deadline}
                onChange={(e) => updateStep(index, 'deadline', e.target.value)}
                required
              />
              {/* Basitlik adına şimdilik categoryId null gidecek veya eklenebilir, backend isteğe bağlı karşılıyor */}
              <button type="button" className={styles.moveBtn} onClick={() => moveStep(index, -1)} disabled={index === 0}>↑</button>
              <button type="button" className={styles.moveBtn} onClick={() => moveStep(index, 1)} disabled={index === newChainTasks.length - 1}>↓</button>
              <button type="button" className={styles.moveBtn} onClick={() => removeStep(index)} disabled={newChainTasks.length === 1} style={{ color: '#ef4444' }}>✕</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className={styles.secondaryBtn} onClick={addStep}>
              ＋ {t('btn_add_step', { defaultValue: 'Adım Ekle' })}
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={creating}>
              {creating ? t('creating', { defaultValue: 'Oluşturuluyor...' }) : t('btn_save', { defaultValue: 'Kaydet' })}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>{t('loading', { defaultValue: 'Yükleniyor...' })}</p>
      ) : chains.length === 0 ? (
        <p style={{ color: 'var(--text3)' }}>{t('empty_chains', { defaultValue: 'Henüz bir görev zinciriniz yok.' })}</p>
      ) : (
        chains.map(chain => {
          const firstTask = chain.tasks[0];
          const completedCount = chain.tasks.filter(t => t.isCompleted).length;
          const isAllCompleted = completedCount === chain.tasks.length;
          const firstDate = new Date(chain.tasks[0].deadline).toLocaleDateString();
          const lastDate = new Date(chain.tasks[chain.tasks.length - 1].deadline).toLocaleDateString();

          return (
            <div key={chain.chainId} className={styles.chainCard}>
              <div 
                className={styles.chainCardHeader} 
                onClick={() => toggleChain(chain.chainId)}
              >
                <div style={{ flex: 1 }}>
                  <div className={styles.chainTitle}>
                    {firstTask?.title} {isAllCompleted && '✅'}
                  </div>
                  <div className={styles.chainMeta}>
                    {chain.tasks.length} görev · {completedCount} tamamlandı · İlk: {firstDate} · Son: {lastDate}
                  </div>
                </div>
                <div className={`${styles.chevron} ${expandedChainId === chain.chainId ? styles.chevronOpen : ''}`}>
                  ▼
                </div>
              </div>

              {expandedChainId === chain.chainId && (
                <div className={styles.taskList}>
                  {chain.tasks.map((task, idx) => {
                    // İlk tamamlanmamış görev "aktif" olarak vurgulanır
                    const firstPendingIndex = chain.tasks.findIndex(t => !t.isCompleted);
                    const isActive = idx === firstPendingIndex;

                    return (
                      <div 
                        key={task.id} 
                        className={`${styles.taskRow} ${task.isCompleted ? styles.taskCompleted : ''} ${isActive ? styles.taskActive : ''}`}
                      >
                        <span style={{ width: '20px' }}>{task.chainOrder}.</span>
                        <span style={{ flex: 1 }}>{task.title}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ChainManagerPanel;
