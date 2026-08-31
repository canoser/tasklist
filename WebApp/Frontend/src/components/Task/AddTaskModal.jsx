import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BaseModal from '../Common/BaseModal';
import styles from './AddTaskModal.module.css';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';
import { useTaskContext } from '../../context/TaskContext';
import chainService from '../../services/chainService';
import HierarchicalCategoryPicker from '../Category/HierarchicalCategoryPicker';

const AddTaskModal = ({ isOpen, onClose, workspaceId }) => {
  const { notifyTaskAdded } = useTaskContext();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  
  const [isChain, setIsChain] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState('');
  const [chains, setChains] = useState([]);
  const [loadingChains, setLoadingChains] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Modal açılma animasyonunun bitmesini bekle (350ms)
      const timer = setTimeout(() => setIsReady(true), 350);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isChain && chains.length === 0) {
      setLoadingChains(true);
      chainService.getChains().then(data => {
        setChains(data || []);
        setLoadingChains(false);
      });
    }
  }, [isChain]);

  // Kapatıldığında stateleri sıfırla
  const handleClose = () => {
    if (isLoading) return;
    setTitle('');
    setDate('');
    setTime('');
    setCategoryId(null);
    setIsChain(false);
    setSelectedChainId('');
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Lütfen bir görev ismi giriniz.');
      return;
    }

    setIsLoading(true);
    try {
      const metadata = time ? JSON.stringify({ hasScheduledTime: true, scheduledTime: time }) : null;

      const newTask = {
        id: Date.now(),
        title: title.trim(),
        categoryId,
        chainId: isChain && selectedChainId ? selectedChainId : undefined,
        taskType: 'Görev',
        deadline: date ? new Date(date).toISOString() : new Date().toISOString(),
        isTeacherAssigned: false,
        isCompleted: false,
        color: 'Blue',
        metadata,
      };

      await taskService.create(newTask);
      toast.success('Görev başarıyla eklendi!');
      notifyTaskAdded(newTask);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error('Görev eklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalFooter = (
    <div className={styles.footerInner}>
      <button className={styles.cancelBtn} onClick={handleClose} disabled={isLoading}>
        İptal
      </button>
      <button className={styles.submitBtn} onClick={handleSave} disabled={isLoading || !title.trim()}>
        Kaydet
      </button>
    </div>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="📋 Görev Ekle"
      preventClose={isLoading}
      footer={modalFooter}
      maxWidth="600px"
    >
      <div className={styles.bodyWrapper}>
        {isLoading && (
          <div className={styles.overlay}>
            <div className={styles.loader} />
            <span>Kaydediliyor...</span>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.inputGroup}>
            <label className={styles.label}>Görev İsmi</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Örn: Proje raporunu tamamla..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Kategori</label>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', minHeight: '48px' }}>
              {isReady ? (
                <HierarchicalCategoryPicker
                  value={categoryId}
                  onChange={id => setCategoryId(id)}
                />
              ) : (
                <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.9rem' }}>Yükleniyor...</div>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label className={styles.label}>Tarih</label>
              <input 
                type="date" 
                className={styles.dateInput}
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.col}>
              <label className={styles.label}>Saat</label>
              <input 
                type="time" 
                className={styles.timeInput}
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={isChain}
                onChange={(e) => setIsChain(e.target.checked)}
                disabled={isLoading}
              />
              Zincir Görevi
            </label>
            
            {isChain && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: '1rem' }}
              >
                <select
                  className={styles.input}
                  value={selectedChainId}
                  onChange={e => setSelectedChainId(e.target.value)}
                  disabled={isLoading || loadingChains}
                >
                  <option value="">{loadingChains ? 'Yükleniyor...' : 'Zincir Seçin'}</option>
                  {chains.map(ch => {
                    const chainName = ch.tasks && ch.tasks.length > 0
                        ? ch.tasks[0].title + ' Zinciri'
                        : ch.chainId;
                    return (
                      <option key={ch.chainId} value={ch.chainId}>
                        {chainName}
                      </option>
                    );
                  })}
                </select>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </BaseModal>
  );
};

export default AddTaskModal;
