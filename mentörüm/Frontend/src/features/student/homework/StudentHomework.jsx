import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Clock, Paperclip, X, MessageSquare, Check, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStudentHomework, useCompleteHomework, useRequestExtension } from '../studentApi';
import { useCreateUploadUrl, useConfirmUpload } from '../../storage/storageApi';
import { compressImage } from '../../../utils/imageCompressor';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { formatDate } from '../../../utils/dateUtils';
import { PriorityBadge, AssignedViaBadge } from '../../../components/common/HomeworkStatusBadges';
import HomeworkAttachmentList from '../../../components/common/HomeworkAttachmentList';
import styles from './StudentHomework.module.css';

// 00:00 saatlerini temizleyen akıllı tarih formatlayıcı (T09)
const formatDueDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return formatDate(dateStr, hasTime ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy');
};

const HomeworkCard = ({ hw, onComplete, onRequestExtension }) => {
  const [percentage, setPercentage] = useState(hw.completionPercentage || 0);
  const [note, setNote] = useState(hw.studentNote || '');
  const [showNoteDetails, setShowNoteDetails] = useState(Boolean(hw.studentNote));
  const [showExtension, setShowExtension] = useState(false);
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const createUpload = useCreateUploadUrl();
  const confirmUpload = useConfirmUpload();

  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingFile(true);
    try {
      const isImg = file.type.startsWith('image/');
      const fileToUpload = isImg ? await compressImage(file) : file;
      const res = await createUpload.mutateAsync({
        fileName: fileToUpload.name,
        fileSizeInBytes: fileToUpload.size,
        contentType: fileToUpload.type,
        homeworkId: hw.id,
      });
      await axios.put(res.uploadUrl, fileToUpload, { headers: { 'Content-Type': fileToUpload.type } });
      await confirmUpload.mutateAsync(res.uploadId);
      setAttachments((prev) => [...prev, { id: res.uploadId, name: fileToUpload.name }]);
      setShowNoteDetails(true);
    } catch (err) {
      alert('Dosya yüklenemedi: ' + (err?.message || 'Hata'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Card interactive className={styles.homeworkCard}>
      <div className={styles.cardHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {hw.courseName && (
              <span className={styles.subjectBadge}>
                {hw.courseName}
              </span>
            )}
            {(hw.subjectName || hw.topicName) && (
              <span className={styles.subjectBadge}>
                {hw.subjectName}{hw.topicName ? ` · ${hw.topicName}` : ''}
              </span>
            )}
            <PriorityBadge priority={hw.priority} />
            <AssignedViaBadge assignedVia={hw.assignedVia} />
          </div>
          <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
        </div>
        <span className={`${styles.statusBadge} ${hw.status === 'OVERDUE' ? styles.overdue : ''}`}>
          {hw.status === 'OVERDUE' ? 'Gecikmiş' : 'Bekliyor'}
        </span>
      </div>
      
      <p className={styles.hwDesc}>{hw.snapshotDesc}</p>

      {/* Öğretmen İnceleme Durumu & Notu */}
      {hw.teacherStatus && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          marginBottom: '10px',
          backgroundColor: hw.teacherStatus === 'REVISE_REQUESTED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${hw.teacherStatus === 'REVISE_REQUESTED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          color: hw.teacherStatus === 'REVISE_REQUESTED' ? '#b91c1c' : '#065f46'
        }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hw.teacherStatus === 'REVISE_REQUESTED' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            <span>{hw.teacherStatus === 'REVISE_REQUESTED' ? 'Öğretmen İncelemesi: Düzeltme İstendi' : 'Öğretmen İncelemesi: Onaylandı'}</span>
          </div>
          {hw.teacherReviewNote && (
            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-color-main)' }}>
              {hw.teacherReviewNote}
            </div>
          )}
        </div>
      )}

      {/* Ekli Ödev Dosyaları (Öğretmen / Koç Tarafından Eklenen) */}
      <HomeworkAttachmentList attachments={hw.attachments} />
      
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>İlerleme Durumun</span>
          <span>%{percentage}</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" step="10"
          value={percentage} 
          onChange={(e) => setPercentage(Number(e.target.value))}
          className={styles.rangeInput}
        />
      </div>

      {/* İsteğe Bağlı Not & Dosya Ekleme Akordeonu (T09) */}
      {showNoteDetails ? (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted, var(--text-secondary))', fontWeight: 600 }}>Ödev Notu & Ekleri</span>
            <button
              type="button"
              onClick={() => setShowNoteDetails(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-color-muted)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <ChevronUp size={14} /> Kapat
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Zorlandığın noktalar / koçuna not (opsiyonel)"
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.82rem' }}
          />
        </div>
      ) : (
        <div style={{ marginTop: '6px' }}>
          <button
            type="button"
            onClick={() => setShowNoteDetails(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary, #10B981)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <MessageSquare size={13} /> {note ? 'Notu / Ekleri Düzenle' : '+ Not veya Dosya Ekle'}
          </button>
        </div>
      )}

      {/* Eklenen Dosyalar Çipleri */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {attachments.map((att) => (
            <div
              key={att.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
              }}
            >
              <Paperclip size={13} style={{ color: 'var(--color-primary)' }} />
              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {att.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.cardFooter}>
        <div className={styles.dueDate}>
          Son Teslim: {formatDueDate(hw.dueDate)}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.docx"
            hidden
            onChange={handleAttachFile}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={uploadingFile}
            onClick={() => fileInputRef.current?.click()}
            title="Ödev Çözümü / Ek Yükle"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Paperclip size={14} />
            <span>{uploadingFile ? 'Yükleniyor…' : 'Ek / Çözüm'}</span>
          </Button>

          <Button 
            size="sm" 
            disabled={uploadingFile}
            onClick={() => onComplete({
              homeworkId: hw.id,
              percentage,
              note,
              attachmentIds: attachments.length > 0 ? attachments.map((a) => a.id) : undefined,
              expectedVersion: hw.version ?? 1, // F2: Eşzamanlılık versiyon kontrolü
            })}
          >
            {percentage === 100 ? 'Tamamla' : 'İlerlemeyi Kaydet'}
          </Button>
        </div>
      </div>

      {showExtension ? (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ek süre mazeretin..."
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="ghost" onClick={() => setShowExtension(false)}>Vazgeç</Button>
            <Button size="sm" onClick={() => { onRequestExtension({ homeworkId: hw.id, reason }); setShowExtension(false); setReason(''); }}>Talebi Gönder</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowExtension(true)} style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={14} /> Ek Süre İste
        </button>
      )}
    </Card>
  );
};

const StudentHomework = () => {
  const { data: homeworks, isLoading, error } = useStudentHomework();
  const { mutate: completeHomework } = useCompleteHomework();
  const requestExtension = useRequestExtension();

  if (isLoading) {
    return <div className={styles.loading}>Ödevleriniz yükleniyor...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ödevler yüklenirken hata oluştu.</div>;
  }

  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ödevlerim</h1>
        <p className={styles.subtitle}>Sana verilen görevleri buradan takip edebilirsin.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Bekleyen Görevler <span className={styles.badge}>{pendingHomeworks.length}</span>
        </h2>
        
        {pendingHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Harika! Bekleyen ödevin yok.</div>
        ) : (
          <div className={styles.list}>
            {pendingHomeworks.map(hw => (
              <HomeworkCard key={hw.id} hw={hw} onComplete={completeHomework} onRequestExtension={(payload) => requestExtension.mutate({ homeworkId: payload.homeworkId, data: { reason: payload.reason } })} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tamamlananlar</h2>
        
        {completedHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Henüz tamamlanmış ödevin yok.</div>
        ) : (
          <div className={styles.list}>
            {completedHomeworks.map(hw => (
              <Card key={hw.id} className={styles.homeworkCardCompleted}>
                <div className={styles.cardHeader}>
                  <div>
                    {(hw.subjectName || hw.topicName) && (
                      <span className={styles.subjectBadge}>
                        {hw.subjectName}{hw.topicName ? ` · ${hw.topicName}` : ''}
                      </span>
                    )}
                    <h3 className={styles.hwTitleCompleted}>{hw.snapshotTitle}</h3>
                  </div>
                  <span className={styles.statusBadgeDone} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={13} /> Tamamlandı
                  </span>
                </div>
                <div className={styles.dueDate}>
                  Teslim Edildi: {formatDate(hw.completedAt, 'dd MMM yyyy')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentHomework;
