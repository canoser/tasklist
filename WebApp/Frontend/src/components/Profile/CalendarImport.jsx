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
        throw new Error(t('ics_empty', { context: tone, defaultValue: 'Takvimde hiç görev bulunamadı.' }));
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
      setMessage(t('ics_success', { context: tone, defaultValue: `${addedCount} görev başarıyla içe aktarıldı!` }));
      
      // Global event fırlatarak takvimi güncelle
      window.dispatchEvent(new Event('tasksUpdated'));
      
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || 'İçe aktarma sırasında bir hata oluştu.');
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
      // CORS sorununu aşmak için basit bir proxy veya direkt fetch denemesi
      // Not: Google iCal linkleri genellikle tarayıcıdan direkt fetch edilemez (CORS nedeniyle)
      // Ancak prototip/test amaçlı allorigins kullanıyoruz
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error('Takvim URL\'sine erişilemedi.');
      const data = await response.json();
      
      if (!data.contents) throw new Error('Takvim verisi alınamadı.');
      
      await importTasks(data.contents);
      setUrl('');
    } catch (err) {
      setIsSuccess(false);
      setMessage(t('ics_cors_error', { context: tone, defaultValue: 'Linkten okunurken hata oluştu. Lütfen bilgisayarınıza indirip Dosya Seç kısmından yüklemeyi deneyin.' }));
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
      setMessage('Dosya okunurken bir hata oluştu.');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className={styles.importContainer}>
      <p className={styles.description}>
        {t('calendar_import_desc', { context: tone, defaultValue: 'Google Takvim, Apple veya Outlook takviminizdeki etkinlikleri .ics linki veya dosyası ile içeri aktarabilirsiniz.' })}
      </p>

      <form className={styles.urlForm} onSubmit={handleUrlSubmit}>
        <input 
          type="url" 
          className={styles.inputField} 
          placeholder="https://... veya webcal://..." 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className={styles.importBtn} disabled={isLoading || !url}>
          {isLoading ? '...' : 'İndir'}
        </button>
      </form>

      <div className={styles.divider}><span>veya</span></div>

      <div className={styles.fileUploadWrap}>
        <button 
          type="button" 
          className={styles.fileBtn} 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          📂 Dosya Yükle (.ics)
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
          <span>Nasıl Yapılır? (Link Nereden Alınır)</span>
          <span>{showHowTo ? '▲' : '▼'}</span>
        </div>
        
        {showHowTo && (
          <div className={styles.howToBody}>
            <h4>Google Takvim</h4>
            <ol>
              <li>calendar.google.com'a girin.</li>
              <li>Takvimlerim altından takvimin <b>Ayarlar ve Paylaşım</b> bölümüne girin.</li>
              <li>En alttaki <b>"iCal biçiminde gizli adres"</b> linkini kopyalayıp buraya yapıştırın.</li>
            </ol>
            
            <h4>Apple Takvim (iCloud)</h4>
            <ol>
              <li>icloud.com/calendar'a girin.</li>
              <li>Takvimin yanındaki <b>Yayınla (Wi-Fi ikonu)</b> tuşuna basıp "Herkese Açık Takvim" yapın.</li>
              <li>Çıkan `webcal://` linkini buraya yapıştırın.</li>
            </ol>

            <h4>Microsoft Outlook</h4>
            <ol>
              <li>outlook.live.com/calendar'a girin. Ayarlar > Takvim > Paylaşılan Takvimler'e gidin.</li>
              <li>Takvimi yayınla kısmından izinleri ayarlayıp "Yayımla" butonuna basın. Çıkan ICS linkini kullanın.</li>
            </ol>

            <div className={styles.wittyJoke}>
              🤖 İşin içinden çıkamazsanız yapay zekaya sormaktan çekinmeyin, o sizin için burada!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarImport;
