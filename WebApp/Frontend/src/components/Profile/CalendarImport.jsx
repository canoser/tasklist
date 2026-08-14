import { useState, useRef } from 'react';
import styles from './CalendarImport.module.css';
import { useTranslation } from 'react-i18next';
import { parseICS } from '../../utils/icsParser';
import taskService from '../../services/taskService';

const CalendarImport = ({ tone, user }) => {
  const { t } = useTranslation('common');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  
  const fileInputRef = useRef(null);

  const importTasks = async (icsString) => {
    setIsLoading(true);
    setMessage('');
    try {
      const parsedTasks = parseICS(icsString, tone, t);
      
      if (!parsedTasks || parsedTasks.length === 0) {
        throw new Error(t('ics_empty', { context: tone }));
      }

      // Prototip için her görevi döngüyle ekliyoruz
      // [MOBILE_PORT_TODO]: Gerçek API'de bulk-insert endpoint'i kullanılmalıdır.
      let addedCount = 0;
      for (const pt of parsedTasks) {
        await taskService.create({
          title: pt.title,
          deadline: pt.deadline,
          categoryId: null,
          chainId: null,
          roleName: null,
          targetCount: null
        });
        addedCount++;
      }

      setIsSuccess(true);
      setMessage(t('ics_success', { context: tone, count: addedCount }));
      
      // Global event fırlatarak takvimi güncelle
      window.dispatchEvent(new Event('tasksUpdated'));
      
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || t('file_read_error', { context: tone }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoading(true);
    setMessage('');
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error(t('url_access_error', { context: tone }));
      const data = await response.json();
      
      if (!data.contents) throw new Error(t('url_access_error', { context: tone }));
      
      await importTasks(data.contents);
      setUrl('');
    } catch (err) {
      setIsSuccess(false);
      setMessage(t('ics_cors_error', { context: tone }));
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      await importTasks(event.target.result);
    };
    reader.onerror = () => {
      setIsSuccess(false);
      setMessage(t('file_read_error', { context: tone }));
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className={styles.importContainer}>
      <p className={styles.description}>
        {t('calendar_import_desc', { context: tone })}
      </p>

      <form className={styles.urlForm} onSubmit={handleUrlSubmit}>
        <input 
          type="url" 
          className={styles.inputField} 
          placeholder={t('calendar_import_placeholder', { context: tone })} 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className={styles.importBtn} disabled={isLoading || !url}>
          {isLoading ? '...' : t('btn_import_url', { context: tone })}
        </button>
      </form>

      <div className={styles.divider}>
        <span>{t('or', { context: tone })}</span>
      </div>

      <div className={styles.fileUploadWrap}>
        <button 
          type="button" 
          className={styles.fileBtn} 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {t('btn_upload_ics', { context: tone })}
        </button>
        <input 
          type="file" 
          accept=".ics" 
          ref={fileInputRef} 
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {message && (
        <div className={`${styles.messageBox} ${isSuccess ? styles.success : styles.error}`}>
          {message}
        </div>
      )}

      {/* Nasıl Yapılır Akordiyonu */}
      <div className={styles.howToWrap}>
        <div 
          className={styles.howToHeader} 
          onClick={() => setShowHowTo(!showHowTo)}
        >
          <span>{t('how_to_title', { context: tone })}</span>
          <span>{showHowTo ? '▲' : '▼'}</span>
        </div>
        
        {showHowTo && (
          <div className={styles.howToBody}>
            <h4>{t('how_to_google_title', { context: tone })}</h4>
            <ol>
              <li>{t('how_to_google_1', { context: tone })}</li>
              <li>{t('how_to_google_2', { context: tone })}</li>
              <li>{t('how_to_google_3', { context: tone })}</li>
            </ol>
            
            <h4>{t('how_to_apple_title', { context: tone })}</h4>
            <ol>
              <li>{t('how_to_apple_1', { context: tone })}</li>
              <li>{t('how_to_apple_2', { context: tone })}</li>
              <li>{t('how_to_apple_3', { context: tone })}</li>
            </ol>

            <h4>{t('how_to_outlook_title', { context: tone })}</h4>
            <ol>
              <li>{t('how_to_outlook_1', { context: tone })}</li>
              <li>{t('how_to_outlook_2', { context: tone })}</li>
            </ol>

            <div className={styles.wittyJoke}>
              {t('how_to_ai_joke', { context: tone })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarImport;
