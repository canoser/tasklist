import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const AssignTaskModal = ({ isOpen, onClose, onAssign, members = [], tone }) => {
  const { t } = useTranslation('common');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [taskType, setTaskType] = useState('Alan Görevi');
  const [assignMode, setAssignMode] = useState('all'); // 'all' | 'specific'
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isChainTask, setIsChainTask] = useState(false);
  const [loading, setLoading] = useState(false);

  const assignableMembers = members.filter(m => m.role !== 'Owner');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    let targetUserIds = [];

    if (assignMode === 'specific') {
      if (selectedMembers.length === 0) {
        alert(t('ws_err_select_member', { context: tone, defaultValue: 'Lütfen en az bir üye seçin.' }));
        return;
      }
      targetUserIds = selectedMembers;
    } else {
      targetUserIds = assignableMembers.map(m => m.userId);
    }

    setLoading(true);
    try {
      await onAssign({ title, description: desc, deadline, taskType, targetUserIds, isChainTask });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('ws_btn_assign_task', { context: tone, defaultValue: 'Görev Ata' })}
      preventClose={loading}
      maxWidth="460px"
    >
      <form onSubmit={handleSubmit} className={modalStyles.form}>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('field_title', { context: tone, defaultValue: 'Başlık' })}</label>
          <input 
            type="text" 
            className={modalStyles.input}
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder={t('field_title_placeholder', { context: tone, defaultValue: 'Görev başlığı' })}
            required 
            autoFocus
          />
        </div>
        
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('field_deadline', { context: tone, defaultValue: 'Son Tarih (Deadline)' })}</label>
          <input 
            type="datetime-local" 
            className={modalStyles.input}
            value={deadline} 
            onChange={e => setDeadline(e.target.value)} 
            required 
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('field_desc', { context: tone, defaultValue: 'Açıklama' })}</label>
          <textarea 
            className={modalStyles.textarea}
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            rows={2}
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_assign_target_label', { context: tone, defaultValue: 'Kime Atanacak?' })}</label>
          <select 
            className={modalStyles.select}
            value={assignMode} 
            onChange={e => setAssignMode(e.target.value)}
          >
            <option value="all">{t('ws_assign_to_all', { context: tone, defaultValue: 'Tüm Üyelere' })}</option>
            <option value="specific">{t('ws_assign_to_specific', { context: tone, defaultValue: 'Belirli Üyelere' })}</option>
          </select>
        </div>

        {assignMode === 'specific' && (
          <div className={modalStyles.formGroup} style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-sm, 8px)', background: 'var(--surface2)' }}>
            {assignableMembers.map(m => (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={selectedMembers.includes(m.userId)}
                  onChange={() => toggleMember(m.userId)}
                />
                <span>{m.displayName} ({m.role})</span>
              </label>
            ))}
          </div>
        )}

        {/* Zincir (Grup) Görevi Seçeneği */}
        <div className={modalStyles.formGroup}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-2)', cursor: 'pointer', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              checked={isChainTask}
              onChange={e => setIsChainTask(e.target.checked)}
            />
            Grup (Zincir) Görevi Olarak İşaretle
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px', marginLeft: '24px', display: 'block' }}>
            Seçilirse, bu görev tek bir grup görevi olarak birleştirilir. Aksi halde herkese bağımsız bireysel görev olarak atanır.
          </span>
        </div>

        <div className={modalStyles.actions}>
          <button type="button" className={modalStyles.btnSecondary} onClick={onClose} disabled={loading}>
            {t('btn_cancel', { context: tone, defaultValue: 'İptal' })}
          </button>
          <button type="submit" className={modalStyles.btnPrimary} disabled={loading}>
            {loading ? t('creating', { context: tone, defaultValue: 'Oluşturuluyor...' }) : t('btn_save', { context: tone, defaultValue: 'Kaydet' })}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AssignTaskModal;

