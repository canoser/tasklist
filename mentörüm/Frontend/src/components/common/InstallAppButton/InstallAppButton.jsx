import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import styles from './InstallAppButton.module.css';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Uygulama zaten yüklü ve standalone çalışıyor mu?
    const checkStandalone = () => {
      const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true;
      setIsStandalone(isPwa);
    };

    // 2. Tablet veya dokunmatik ekran kontrolü (1024px ve altı)
    const checkDevice = () => {
      const isTabletScreen = window.innerWidth <= 1024;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTabletOrMobile(isTabletScreen || isTouch);
    };

    checkStandalone();
    checkDevice();

    window.addEventListener('resize', checkDevice);

    // 3. PWA BeforeInstallPrompt yakalama
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Zaten kuruluysa veya tablet/mobil değilse ve install prompt yoksa gösterme
  if (isStandalone) return null;
  if (!isTabletOrMobile && !deferredPrompt) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowModal(true);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return (
    <>
      <button
        type="button"
        className={styles.installBtn}
        onClick={handleInstallClick}
        title="Mentörüm'ü Tabletinize Uygulama Olarak Yükleyin"
        aria-label="Uygulamayı İndir"
      >
        <Download size={15} strokeWidth={2.2} className={styles.downloadIcon} />
        <span className={styles.btnText}>Uygulamayı İndir</span>
      </button>

      {/* Tablet Kurulum Rehberi Modalı (PWA prompt desteklemeyen Safari vb. için) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Uygulama Olarak Yükle"
        maxWidth="440px"
      >
        <p className={styles.modalDesc}>
          Mentörüm'ü tabletinize veya cihazınıza tam ekran uygulama olarak kurarak daha hızlı ve akıcı kullanabilirsiniz.
        </p>

        <div className={styles.stepsContainer}>
          {isIOS ? (
            <>
              <div className={styles.stepItem}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepText}>
                  Safari alt/üst menüsündeki <strong>Paylaş</strong> simgesine (<Share2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />) dokunun.
                </div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepText}>
                  Açılan menüyü kaydırıp <strong>"Ana Ekrana Ekle"</strong> (<PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />) seçeneğini seçin.
                </div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepText}>
                  Sağ üstteki <strong>"Ekle"</strong> butonuna dokunarak kurulumu tamamlayın.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.stepItem}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepText}>
                  Tarayıcınızın sağ üstündeki <strong>üç nokta menüsüne</strong> (⋮) dokunun.
                </div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepText}>
                  <strong>"Uygulamayı Yükle"</strong> veya <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.
                </div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepText}>
                  Onaylayarak tablet ana ekranınızdan doğrudan uygulamaya erişin.
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => setShowModal(false)}
          >
            Anladım
          </Button>
        </div>
      </Modal>
    </>
  );
}
