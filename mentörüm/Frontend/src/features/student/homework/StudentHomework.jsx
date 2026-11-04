import React, { useRef, useState } from 'react';
import { Clock, Paperclip, X, MessageSquare, ChevronUp, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import {
  useStudentHomework,
  useCompleteHomework,
  useRequestExtension,
  useStudentProfile,
  useCreateStudentSelfHomework,
} from '../studentApi';
import { useUploadFile } from '../../storage/storageApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
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

const HomeworkCard = ({ hw, canCompleteDirect, onComplete, onRequestExtension }) => {
  const [percentage, setPercentage] = useState(hw.completionPercentage || 0);
  const [note, setNote] = useState(hw.studentNote || '');
  const [showNoteDetails, setShowNoteDetails] = useState(Boolean(hw.studentNote));
  const [showExtension, setShowExtension] = useState(false);
  const [reason, setReason] = useState('');
  const [requestedDueDate, setRequestedDueDate] = useState('');
  const [extensionSent, setExtensionSent] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const uploadFile = useUploadFile();

  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const res = await uploadFile.mutateAsync({ file, homeworkId: hw.id });
      setAttachments((prev) => [...prev, { id: res.uploadId, name: res.fileName }]);
      setShowNoteDetails(true);
    } catch (err) {
      alert('Dosya yüklenemedi: ' + (err?.message || 'Hata'));
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
            {hw.createdByStudent && (
              <span className={styles.subjectBadge} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                👤 Kendi Çalışmam
              </span>
            )}
            {hw.pendingApproval && (
              <span className={styles.subjectBadge} style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#d97706' }}>
                ⏳ Koç Onayı Bekliyor
              </span>
            )}
          </div>
          <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
        </div>
        <StatusBadge status={hw.status} />
      </div>
      
      <p className={styles.hwDesc}>{hw.snapshotDesc}</p>

      {/* Öğretmen İnceleme Durumu & Notu */}
      {(hw.feedback || hw.teacherStatus || hw.completedBy === 'Teacher') && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          marginBottom: '10px',
          backgroundColor: hw.status !== 'DONE' && hw.feedback ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${hw.status !== 'DONE' && hw.feedback ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          color: hw.status !== 'DONE' && hw.feedback ? '#b91c1c' : '#065f46'
        }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hw.status !== 'DONE' && hw.feedback ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            <span>
              {hw.status !== 'DONE' && hw.feedback
                ? 'Öğretmen İncelemesi: Düzeltme / Not'
                : 'Öğretmen İncelemesi: Onaylandı'}
            </span>
          </div>
          {(hw.feedback || hw.teacherReviewNote) && (
            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-color-main)' }}>
              {hw.feedback || hw.teacherReviewNote}
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
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setShowNoteDetails(false)}
            >
              <ChevronUp size={14} /> Kapat
            </Button>
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
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setShowNoteDetails(true)}
            style={{ color: 'var(--color-primary, #10B981)', padding: '2px 6px' }}
          >
            <MessageSquare size={13} /> {note ? 'Notu / Ekleri Düzenle' : '+ Not veya Dosya Ekle'}
          </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => handleRemoveAttachment(att.id)}
              >
                <X size={14} />
              </Button>
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
            disabled={uploadFile.isPending}
            onClick={() => fileInputRef.current?.click()}
            title="Ödev Çözümü / Ek Yükle"
          >
            <Paperclip size={14} />
            <span>{uploadFile.isPending ? 'Yükleniyor…' : 'Ek / Çözüm'}</span>
          </Button>

          <Button 
            size="sm" 
            data-testid={`hw-complete-submit-btn-${hw.id}`}
            disabled={uploadFile.isPending || hw.pendingApproval}
            onClick={() => onComplete({
              homeworkId: hw.id,
              percentage,
              note,
              attachmentIds: attachments.length > 0 ? attachments.map((a) => a.id) : undefined,
              expectedVersion: hw.version ?? 1, // F2: Eşzamanlılık versiyon kontrolü
            })}
          >
            {hw.pendingApproval
              ? '⏳ Onay Bekleniyor'
              : percentage === 100
                ? canCompleteDirect
                  ? 'Tamamla'
                  : 'Tamamlama Onaya Gönder'
                : 'İlerlemeyi Kaydet'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-color-muted)' }}>Talep Edilen Yeni Tarih:</label>
            <input
              type="date"
              value={requestedDueDate}
              onChange={(e) => setRequestedDueDate(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="ghost" onClick={() => setShowExtension(false)}>Vazgeç</Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await onRequestExtension({
                    homeworkId: hw.id,
                    reason,
                    requestedDueDate: requestedDueDate || undefined,
                  });
                  setShowExtension(false);
                  setReason('');
                  setRequestedDueDate('');
                  setExtensionSent(true);
                } catch (err) {
                  alert(err?.message || 'Ek süre talebi gönderilemedi.');
                }
              }}
            >
              Talebi Gönder
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button type="button" variant="ghost" size="xs" onClick={() => setShowExtension(true)} style={{ color: 'var(--color-primary)', padding: '2px 6px' }}>
            <Clock size={14} /> Ek Süre İste
          </Button>
          {extensionSent && (
            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 500 }}>✓ Talebin koçuna iletildi</span>
          )}
        </div>
      )}
    </Card>
  );
};

const StudentHomework = () => {
  const { data: homeworks, isLoading, error } = useStudentHomework();
  const { data: profile } = useStudentProfile();
  const { mutate: completeHomework } = useCompleteHomework();
  const requestExtension = useRequestExtension();
  const createSelfHw = useCreateStudentSelfHomework();

  const hasCoach = Boolean(profile?.hasCoach);
  const perms = profile?.permissions || {};
  const canSelfAssignWork = !hasCoach || perms.canSelfAssignWork === true;
  const canCompleteDirect = !hasCoach || perms.canCompleteHomework !== false;

  const [showAddModal, setShowAddModal] = useState(false);
  const [selfTitle, setSelfTitle] = useState('');
  const [selfDesc, setSelfDesc] = useState('');
  const [selfSource, setSelfSource] = useState('');
  const [selfDueDate, setSelfDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selfPriority, setSelfPriority] = useState('NORMAL');

  const handleAddSelfHomework = async (e) => {
    e.preventDefault();
    if (!selfTitle.trim()) return;
    await createSelfHw.mutateAsync({
      subjectId: null,
      title: selfTitle.trim(),
      description: selfDesc.trim() || null,
      source: selfSource.trim() || null,
      dueDate: selfDueDate,
      priority: selfPriority,
    });
    setSelfTitle('');
    setSelfDesc('');
    setSelfSource('');
    setShowAddModal(false);
  };

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
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className={styles.title}>Ödevlerim</h1>
          <p className={styles.subtitle}>Sana verilen görevleri ve kendi çalışma hedeflerini buradan takip edebilirsin.</p>
        </div>
        {canSelfAssignWork && (
          <Button size="sm" data-testid="self-assign-hw-open-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> + Kendime Çalışma / Ödev Ekle
          </Button>
        )}
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
              <HomeworkCard
                key={hw.id}
                hw={hw}
                canCompleteDirect={canCompleteDirect}
                onComplete={completeHomework}
                onRequestExtension={(payload) =>
                  requestExtension.mutateAsync({
                    homeworkId: payload.homeworkId,
                    data: { reason: payload.reason, requestedDueDate: payload.requestedDueDate },
                  })
                }
              />
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
                  <StatusBadge status={hw.status} label="✓ Tamamlandı" />
                </div>
                <div className={styles.dueDate}>
                  Teslim Edildi: {formatDate(hw.completedAt, 'dd MMM yyyy')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Kendime Çalışma / Ödev Ekle"
        maxWidth="420px"
      >
        <form onSubmit={handleAddSelfHomework} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            data-testid="self-assign-hw-title-input"
            label="Çalışma / Ödev Başlığı *"
            placeholder="Örn: Paragraf 40 Soru Çözümü"
            value={selfTitle}
            onChange={(e) => setSelfTitle(e.target.value)}
            required
          />
          <Input
            label="Kaynak / Konu (İsteğe Bağlı)"
            placeholder="Örn: Bilgi Sarmal Türkçe"
            value={selfSource}
            onChange={(e) => setSelfSource(e.target.value)}
          />
          <Input
            label="Açıklama / Hedef (İsteğe Bağlı)"
            placeholder="Örn: Süre tutarak 45 dakikada tamamla"
            value={selfDesc}
            onChange={(e) => setSelfDesc(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input
              label="Hedef Tarih *"
              type="date"
              value={selfDueDate}
              onChange={(e) => setSelfDueDate(e.target.value)}
              required
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 4, fontWeight: 600 }}>Öncelik</label>
              <select
                value={selfPriority}
                onChange={(e) => setSelfPriority(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-color-surface)', color: 'var(--text-color-primary)' }}
              >
                <option value="HIGH">Yüksek</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Düşük</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
              İptal
            </Button>
            <Button type="submit" variant="primary" size="sm" data-testid="self-assign-hw-submit-btn" isLoading={createSelfHw.isPending}>
              Ekle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentHomework;
