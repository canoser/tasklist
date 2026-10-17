import React, { useState } from 'react';
import { usePrograms } from '../coachSchoolApi';
import { useApprovals, useApproveItem, useRejectItem } from '../coachApi';
import styles from './ApprovalsPage.module.css';

const ENTITY_TYPE_LABELS = {
  HOMEWORK_DONE: 'Ödev Tamamlama',
  SCHEDULE_CHANGE: 'Program Değişikliği',
  PAYMENT_CLAIM: 'Ödeme Bildirimi'
};

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
    let payload = item.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }

    if (item.entity_type === 'PAYMENT_CLAIM') {
      return (
        <div>
          <strong>Tutar:</strong> {payload.amount || '-'} {payload.currency || 'TRY'} | 
          <strong> Yöntem:</strong> {payload.method || 'Banka Havalesi'}
          {payload.notes && <div><strong>Not:</strong> {payload.notes}</div>}
        </div>
      );
    }

    if (item.entity_type === 'HOMEWORK_DONE') {
      return (
        <div>
          <strong>Öğrenci Notu:</strong> {payload.studentNotes || 'Belirtilmedi'}
        </div>
      );
    }

    if (item.entity_type === 'SCHEDULE_CHANGE') {
      return (
        <div>
          <strong>Değişiklik Talebi:</strong> {payload.reason || payload.description || 'Detay girilmedi'}
        </div>
      );
    }

    return <div>{JSON.stringify(payload)}</div>;
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
            <button 
              className={styles.approveAllBtn}
              onClick={handleApproveAll}
              disabled={approveMutation.isPending}
            >
              Tümünü Onayla
            </button>
          )}
        </div>
      </div>

      <div className={styles.filterBar}>
        <button 
          className={`${styles.filterBtn} ${filterStatus === 'PENDING' ? styles.activeFilter : ''}`}
          onClick={() => setFilterStatus('PENDING')}
        >
          Bekleyenler
        </button>
        <button 
          className={`${styles.filterBtn} ${filterStatus === 'APPROVED' ? styles.activeFilter : ''}`}
          onClick={() => setFilterStatus('APPROVED')}
        >
          Onaylananlar
        </button>
        <button 
          className={`${styles.filterBtn} ${filterStatus === 'REJECTED' ? styles.activeFilter : ''}`}
          onClick={() => setFilterStatus('REJECTED')}
        >
          Reddedilenler
        </button>
        <button 
          className={`${styles.filterBtn} ${filterStatus === 'ALL' ? styles.activeFilter : ''}`}
          onClick={() => setFilterStatus('ALL')}
        >
          Tümü
        </button>
      </div>

      {isProgramsLoading || isApprovalsLoading ? (
        <div className={styles.emptyState}>Yükleniyor...</div>
      ) : approvals.length === 0 ? (
        <div className={styles.emptyState}>
          {filterStatus === 'PENDING' ? 'Bekleyen herhangi bir onay talebi bulunmuyor.' : 'Kayıt bulunamadı.'}
        </div>
      ) : (
        <div className={styles.list}>
          {approvals.map((item) => (
            <div key={item.id} className={styles.card}>
              <div className={styles.itemInfo}>
                <div className={styles.itemHeader}>
                  <span className={styles.entityBadge}>
                    {ENTITY_TYPE_LABELS[item.entity_type] || item.entity_type}
                  </span>
                  <span className={styles.date}>
                    {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : ''}
                  </span>
                  <span className={`${styles.statusBadge} ${
                    item.status === 'PENDING' ? styles.statusPending :
                    item.status === 'APPROVED' ? styles.statusApproved : styles.statusRejected
                  }`}>
                    {item.status === 'PENDING' ? 'Bekliyor' :
                     item.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                  </span>
                </div>

                <div className={styles.itemDetails}>
                  {renderPayloadDetails(item)}
                </div>

                {item.rejection_reason && (
                  <div className={styles.rejectionReason}>
                    Red Gerekçesi: {item.rejection_reason}
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
                    <button 
                      onClick={() => handleRejectSubmit(item.id)}
                      disabled={!rejectReason.trim() || rejectMutation.isPending}
                      style={{ padding: '0.4rem 0.8rem', background: 'var(--color-danger, #ef4444)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Onayla ve Reddet
                    </button>
                    <button 
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      İptal
                    </button>
                  </div>
                )}
              </div>

              {item.status === 'PENDING' && rejectingId !== item.id && (
                <div className={styles.actions}>
                  <button 
                    className={styles.approveBtn}
                    onClick={() => handleApprove(item.id)}
                    disabled={approveMutation.isPending}
                  >
                    Onayla
                  </button>
                  <button 
                    className={styles.rejectBtn}
                    onClick={() => { setRejectingId(item.id); setRejectReason(''); }}
                  >
                    Reddet
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
