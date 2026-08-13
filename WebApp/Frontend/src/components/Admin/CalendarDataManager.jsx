import React, { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import apiClient from '../../services/apiClient';
import styles from './AdminPanel.module.css';
import { useTranslation } from 'react-i18next';

const CalendarDataManager = ({ tone }) => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const downloadFile = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/admin/calendar/export-template');
      downloadFile(res.data, 'takvim_sablon.json');
      setSuccessMsg(t('msg_template_success', { context: tone }));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(t('msg_template_fail', { context: tone }));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCurrent = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/admin/calendar/export-current');
      downloadFile(res.data, 'takvim_yedek.json');
      setSuccessMsg(t('msg_backup_success', { context: tone }));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(t('msg_backup_fail', { context: tone }));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        setError(null);
        setSuccessMsg('');
        
        const jsonData = JSON.parse(event.target.result);
        
        const res = await apiClient.post('/admin/calendar/import', jsonData, {
          headers: {
            'Idempotency-Key': `import-${Date.now()}`
          }
        });
        
        setSuccessMsg(res.data.Message || t('msg_import_success', { context: tone, count: res.data.ImportedCount || 0 }));
      } catch (err) {
        console.error("Import error:", err);
        setError(err.response?.data?.Message || t('msg_import_fail', { context: tone }));
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={styles.settingsGrid} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className={styles.sectionDivider} style={{ margin: '0' }}>
        <h2>{t('tab_data', { context: tone })}</h2>
      </div>
      
      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className={styles.successAlert}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className={styles.settingCard} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.settingInfo}>
          <h3>{t('btn_download_template', { context: tone })}</h3>
          <p>{t('desc_template', { context: tone })}</p>
        </div>
        <button 
          onClick={handleDownloadTemplate} 
          className={styles.saveBtn} 
          disabled={loading}
          type="button"
        >
          <FileJson size={18} />
          <span>{t('btn_download_template', { context: tone })}</span>
        </button>
      </div>

      <div className={styles.settingCard} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.settingInfo}>
          <h3>{t('btn_backup', { context: tone })}</h3>
          <p>{t('desc_backup', { context: tone })}</p>
        </div>
        <button 
          onClick={handleDownloadCurrent} 
          className={styles.saveBtn} 
          disabled={loading}
          type="button"
          style={{ backgroundColor: 'var(--accent-secondary)' }}
        >
          <Download size={18} />
          <span>{t('btn_backup', { context: tone })}</span>
        </button>
      </div>

      <div className={styles.settingCard} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.settingInfo}>
          <h3>{t('btn_import', { context: tone })}</h3>
          <p>{t('desc_import', { context: tone })}</p>
          <p style={{ color: 'var(--text-warning)', fontWeight: 'bold', marginTop: '5px', fontSize: '0.85rem' }}>
            Dikkat: Mevcut verileri silmez, üzerlerine ekler. Kategori hiyerarşisinde üst kategorilerin JSON dosyasında üst sıralarda olması gerekir.
          </p>
          {/* [MOBILE_PORT_TODO]: Mobil uygulamalarda yerel dosya seçici (Filesystem) entegrasyonu gerekebilir. */}
        </div>
        <div>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          <button 
            onClick={triggerFileInput} 
            className={styles.saveBtn} 
            disabled={loading}
            type="button"
          >
            <Upload size={18} />
            <span>{t('btn_import', { context: tone })}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarDataManager;
