import React, { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import apiClient from '../../services/apiClient';
import styles from './AdminPanel.module.css';

const CalendarDataManager = () => {
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
      setSuccessMsg('Şablon dosyası başarıyla indirildi.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Şablon indirilirken hata oluştu.');
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
      setSuccessMsg('Mevcut takvim yedeği başarıyla indirildi.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Mevcut veri indirilirken hata oluştu.');
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
        
        setSuccessMsg(res.data.Message || 'Veri başarıyla içeri aktarıldı.');
      } catch (err) {
        console.error("Import error:", err);
        setError(err.response?.data?.Message || 'İçeri aktarma işlemi başarısız oldu. Dosya formatını kontrol edin.');
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
        <h2>Takvim Veri Yönetimi</h2>
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

      <div className={styles.settingCard} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.settingInfo}>
          <h3>Örnek Şablon İndir</h3>
          <p>Yapay zeka (AI) ajanları için kullanılacak, doğru JSON formatına sahip boş bir şablon dosyası indirir.</p>
        </div>
        <button 
          onClick={handleDownloadTemplate} 
          className={styles.saveBtn} 
          disabled={loading}
          type="button"
        >
          <FileJson size={18} />
          <span>Şablonu İndir</span>
        </button>
      </div>

      <div className={styles.settingCard} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.settingInfo}>
          <h3>Mevcut Veriyi Yedekle</h3>
          <p>Şu anki takviminizdeki tüm kategorileri, zincirleri ve görevleri JSON dosyası olarak indirir.</p>
        </div>
        <button 
          onClick={handleDownloadCurrent} 
          className={styles.saveBtn} 
          disabled={loading}
          type="button"
          style={{ backgroundColor: 'var(--accent-secondary)' }}
        >
          <Download size={18} />
          <span>Yedekle</span>
        </button>
      </div>

      <div className={styles.settingCard} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.settingInfo}>
          <h3>JSON İçe Aktar</h3>
          <p>JSON dosyasından yeni kategoriler ve görevler ekler.</p>
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
            <span>Dosya Yükle</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarDataManager;
