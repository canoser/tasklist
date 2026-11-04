import React, { useState } from 'react';
import { usePrograms } from '../coachSchoolApi';
import { useApprovals, useApproveItem, useRejectItem } from '../coachApi';
import { APPROVAL_ENTITY_LABELS, parseApprovalPayload } from '../../../constants/domainConstants';
import Button from '../../../components/common/Button/Button';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import styles from './ApprovalsPage.module.css';

const ENTITY_TYPE_LABELS = APPROVAL_ENTITY_LABELS;

export default function ApprovalsPage() {
  const { data: programs = [], isLoading: isProgramsLoading } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [filterStatus, setFilterStatus] = useState('PENDING'); // PENDING, APPROVED, REJECTED, ALL
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // İlk programı otomatik seç
  const activeProgramId = selectedProgramId || (programs.length > 0 ? programs[0].id : '');

  const { data: approvals = [], isLoading: isApprovalsLoading } = useApprovals(
    activeProgramId,
    filterStatus === 'ALL' ? null : filterStatus
  );

  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();

  const handleApprove = (id) => {
    approveMutation.mutate(id);
  };

  const handleRejectSubmit = (id) => {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate({ id, reason: rejectReason.trim() }, {
      onSuccess: () => {
        setRejectingId(null);
        setRejectReason('');
      }
    });
  };

  const handleApproveAll = async () => {
    const pendingItems = approvals.filter(item => item.status === 'PENDING');
    for (const item of pendingItems) {
      await approveMutation.mutateAsync(item.id);
    }
  };

  const renderPayloadDetails = (item) => {
    const payload = parseApprovalPayload(item.payload);

    const studentName = payload?.studentName || payload?.StudentName;
    const parentName = payload?.parentName || payload?.ParentName;
    const studentLine = studentName ? (
      <div style={{ marginBottom: 4 }}>
        <strong>Öğrenci:</strong> {studentName}
        {parentName ? ` (Veli: ${parentName})` : ''}
      </div>
    ) : null;

    if (item.entityType === 'PAYMENT_CLAIM') {
      const amount = payload?.amount ?? payload?.Amount;
      const currency = payload?.currency ?? payload?.Currency ?? 'TRY';
      const method = payload?.method ?? payload?.Method ?? 'Banka Havalesi';
      const notes = payload?.notes ?? payload?.Notes;
      const receiptUrl = payload?.receiptUrl ?? payload?.ReceiptUrl;
      return (
        <div>
          {studentLine}
          <strong>Tutar:</strong> {amount ?? '-'} {currency} |{' '}
          <strong>Yöntem:</strong> {method}
          {notes && <div><strong>Not:</strong> {notes}</div>}
          {receiptUrl && (
            <div style={{ marginTop: 4 }}>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.82rem' }}
              >
                📎 Dekont / Belgeyi Görüntüle ↗
              </a>
            </div>
          )}
        </div>
      );
    }

    if (item.entityType === 'HOMEWORK_DONE') {
      return (
        <div>
          {studentLine}
          {(payload?.homeworkTitle || payload?.title) && (
            <div><strong>Ödev:</strong> {payload.homeworkTitle || payload.title}</div>
          )}
          <div>
            <strong>Öğrenci Notu:</strong> {payload?.note || payload?.studentNotes || 'Belirtilmedi'}
          </div>
        </div>
      );
    }

    if (item.entityType === 'HOMEWORK_EXTENSION') {
      return (
        <div>
          {studentLine}
          {(payload?.homeworkTitle || payload?.title) && (
            <div><strong>Ödev:</strong> {payload.homeworkTitle || payload.title}</div>
          )}
          {payload?.requestedDays && (
            <div><strong>Talep Edilen Süre:</strong> +{payload.requestedDays} gün</div>
          )}
          {payload?.requestedDueDate && (
            <div><strong>Talep Edilen Tarih:</strong> {new Date(payload.requestedDueDate).toLocaleDateString('tr-TR')}</div>
          )}
          <div>
            <strong>Gerekçe:</strong> {payload?.reason || payload?.note || 'Belirtilmedi'}
          </div>
        </div>
      );
    }

    if (item.entityType === 'SCHEDULE_CHANGE') {
      return (
        <div>
          {studentLine}
          <strong>Değişiklik Talebi:</strong> {payload?.reason || payload?.description || 'Detay girilmedi'}
        </div>
      );
    }

    return (
      <div>
        {studentLine}
        {payload?.reason || payload?.note || payload?.description || 'Detay bulunmuyor'}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Onay Merkezi</h1>
          <p>Öğrenci ve velilerden gelen tamamlama ve ödeme bildirimlerini inceleyin.</p>
        </div>

        <div className={styles.headerActions}>
          {programs.length > 1 && (
            <select 
              className={styles.programSelect}
              value={activeProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
            >
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {approvals.some(item => item.status === 'PENDING') && (
            <Button 
              variant="primary"
              size="sm"
              onClick={handleApproveAll}
              disabled={approveMutation.isPending}
            >
              Tümünü Onayla
            </Button>
          )}
        </div>
      </div>

      <SegmentedTabs
        activeTab={filterStatus}
        onChange={setFilterStatus}
        tabs={[
          { id: 'PENDING', label: 'Bekleyenler' },
          { id: 'APPROVED', label: 'Onaylananlar' },
          { id: 'REJECTED', label: 'Reddedilenler' },
          { id: 'ALL', label: 'Tümü' },
        ]}
      />

      {isProgramsLoading || isApprovalsLoading ? (
        <div className={styles.emptyState}>Yükleniyor...</div>
      ) : approvals.length === 0 ? (
        <div className={styles.emptyState}>
          {filterStatus === 'PENDING' ? 'Bekleyen herhangi bir onay talebi bulunmuyor.' : 'Kayıt bulunamadı.'}
        </div>
      ) : (
        <div className={styles.list}>
          {approvals.map((item) => (
            <div key={item.id} className={styles.card} data-testid={`approval-card-${item.id}`}>
              <div className={styles.itemInfo}>
                <div className={styles.itemHeader}>
                  <span className={styles.entityBadge}>
                    {ENTITY_TYPE_LABELS[item.entityType] || item.entityType}
                  </span>
                  <span className={styles.date}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR') : ''}
                  </span>
                  <StatusBadge status={item.status} />
                </div>

                <div className={styles.itemDetails}>
                  {renderPayloadDetails(item)}
                </div>

                {item.rejectionReason && (
                  <div className={styles.rejectionReason}>
                    Red Gerekçesi: {item.rejectionReason}
                  </div>
                )}

                {rejectingId === item.id && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Reddetme nedeni girin..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', flex: 1 }}
                    />
                    <Button 
                      variant="danger"
                      size="xs"
                      onClick={() => handleRejectSubmit(item.id)}
                      disabled={!rejectReason.trim() || rejectMutation.isPending}
                    >
                      Onayla ve Reddet
                    </Button>
                    <Button 
                      variant="ghost"
                      size="xs"
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                    >
                      İptal
                    </Button>
                  </div>
                )}
              </div>

              {item.status === 'PENDING' && rejectingId !== item.id && (
                <div className={styles.actions}>
                  <Button 
                    variant="success"
                    size="sm"
                    data-testid={`approval-approve-btn-${item.id}`}
                    onClick={() => handleApprove(item.id)}
                    disabled={approveMutation.isPending}
                  >
                    Onayla
                  </Button>
                  <Button 
                    variant="danger-outline"
                    size="sm"
                    onClick={() => { setRejectingId(item.id); setRejectReason(''); }}
                  >
                    Reddet
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
