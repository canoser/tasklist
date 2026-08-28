import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { storageService } from '../../services/storageService';
import { taskService } from '../../services/taskService';
import { v4 as uuidv4 } from 'uuid';
import BaseModal from '../Common/BaseModal';
import styles from './FileUploadModal.module.css';

const FileUploadModal = ({ isOpen, onClose, workspaceId, taskId, tone, onSuccess }) => {
  const { t } = useTranslation('common');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Modal kapandığında state'i sıfırla
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setUploading(false);
      setProgress(0);
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Basit validasyonlar
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError(t('err_file_too_large', { context: tone, defaultValue: 'Dosya boyutu 50MB sınırını aşıyor.' }));
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > 50 * 1024 * 1024) {
        setError(t('err_file_too_large', { context: tone, defaultValue: 'Dosya boyutu 50MB sınırını aşıyor.' }));
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // 1. Backend'den Presigned URL al (Kota ayrılır, Pending kaydı oluşur)
      const { uploadUrl, fileId } = await storageService.getUploadUrl(
        workspaceId,
        file.name,
        file.type || 'application/octet-stream',
        file.size,
        description
      );

      // 2. Doğrudan R2'ye yükle
      await storageService.uploadToR2(uploadUrl, file, (percent) => {
        setProgress(percent);
      });

      // 3. Backend'e onayı bildir (Idempotency Key ile)
      const idempotencyKey = uuidv4();
      await storageService.confirmUpload(fileId, idempotencyKey);

      // 4. Göreve bağla (Eğer taskId varsa)
      if (taskId) {
        await taskService.attachFile(taskId, fileId);
      }

      // Başarılı
      if (onSuccess) {
        onSuccess(fileId);
      }
      onClose();
    } catch (err) {
      console.error('Yükleme hatası:', err);
      setError(err.response?.data?.Message || err.message || t('err_upload_failed', { context: tone, defaultValue: 'Yükleme başarısız oldu.' }));
    } finally {
      setUploading(false);
    }
  };

  const footerActions = (
    <div className={styles.footerActions}>
      {!uploading && (
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          {t('btn_cancel', { context: tone, defaultValue: 'İptal' })}
        </button>
      )}
      <button 
        type="button"
        className={`${styles.uploadBtn} ${(!file || uploading) ? styles.disabled : ''}`} 
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading 
          ? t('ws_btn_uploading', { context: tone, defaultValue: 'Yükleniyor...' }) 
          : t('ws_btn_start_upload', { context: tone, defaultValue: 'Yüklemeyi Başlat' })}
      </button>
    </div>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t('ws_modal_upload_title', { context: tone, defaultValue: 'Dosya Yükle' })}
      footer={footerActions}
      preventClose={uploading}
      maxWidth="480px"
    >
      {!file ? (
        <div 
          className={styles.dropzone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            className={styles.hiddenInput} 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,.zip,.rar"
            // [MOBILE_PORT_TODO]: Mobil uygulamalarda @capacitor/filesystem veya @capacitor/camera
            // kullanarak native dosya seçici entegre edilmelidir.
          />
          <div className={styles.dropIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <div className={styles.dropText}>
            {t('ws_drop_file_here', { context: tone, defaultValue: 'Dosyayı buraya sürükleyin veya seçmek için tıklayın' })}
          </div>
          <div className={styles.dropHint}>
            {t('ws_file_limits_hint', { context: tone, defaultValue: 'Maksimum dosya boyutu: 50MB. Desteklenen formatlar: Resim, PDF, Belge.' })}
          </div>
        </div>
      ) : (
        <div className={styles.filePreview}>
          <div className={styles.fileInfo}>
            <div className={styles.fileIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            </div>
            <div className={styles.fileDetails}>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
            {!uploading && (
              <button type="button" className={styles.removeFileBtn} onClick={() => setFile(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          
          {!uploading && (
            <div className={styles.descContainer}>
              <textarea 
                className={styles.descInput}
                placeholder={t('ws_file_desc_placeholder', { context: tone, defaultValue: 'Bu dosya hakkında kısa bir açıklama ekleyin (isteğe bağlı)...' })}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {uploading && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
              </div>
              <div className={styles.progressText}>{progress}% {t('ws_uploading', { context: tone, defaultValue: 'Yükleniyor...' })}</div>
            </div>
          )}
        </div>
      )}

      {error && <div className={styles.errorText}>{error}</div>}
    </BaseModal>
  );
};

export default FileUploadModal;

