import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { useParentChildren, useParentChildPayments, useCreatePaymentClaim } from '../parentApi';

export default function ParentPaymentsPage() {
  const { data: children = [], isLoading: isChildrenLoading } = useParentChildren();
  const activeStudentId = children[0]?.studentId;
  const studentName = children[0]?.fullName || 'Öğrenci';

  const { data: payments = [], isLoading: isPaymentsLoading } = useParentChildPayments(activeStudentId);
  const claimMutation = useCreatePaymentClaim();

  const [claimingItemId, setClaimingItemId] = useState(null);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimReceiptUrl, setClaimReceiptUrl] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  if (isChildrenLoading || isPaymentsLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Ödeme bilgileri yükleniyor...</div>;
  }

  const handleClaimSubmit = (item) => {
    claimMutation.mutate({
      studentId: activeStudentId,
      data: {
        itemId: item.id,
        amount: claimAmount ? parseFloat(claimAmount) : (item.baseAmount - item.paidAmount),
        receiptUrl: claimReceiptUrl.trim() || null,
        notes: claimNotes.trim() || null
      }
    }, {
      onSuccess: () => {
        setClaimingItemId(null);
        setClaimAmount('');
        setClaimReceiptUrl('');
        setClaimNotes('');
        setClaimSuccess('Ödeme bildiriminiz koçunuza iletildi.');
        setTimeout(() => setClaimSuccess(''), 4000);
      }
    });
  };

  // Toplam kalan bakiye
  const totalDue = payments.reduce((acc, p) => acc + (p.baseAmount - p.paidAmount), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
          Ödeme ve Finans Takibi
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {studentName} için belirlenen ödeme planı ve tahsilat dökümü (Canlı güncellenir).
        </p>
      </div>

      {claimSuccess && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success, #10b981)', fontSize: '0.9rem', fontWeight: 600 }}>
          ✓ {claimSuccess}
        </div>
      )}

      {/* Özet Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card padding="md">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ödenen Toplam</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-success, #10b981)', marginTop: '4px' }}>
            {totalPaid.toLocaleString('tr-TR')} TRY
          </div>
        </Card>
        <Card padding="md">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kalan Toplam Bakiye</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: totalDue > 0 ? 'var(--color-danger, #ef4444)' : 'var(--text-primary)', marginTop: '4px' }}>
            {totalDue.toLocaleString('tr-TR')} TRY
          </div>
        </Card>
      </div>

      {/* Ödeme Kalemleri */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Ödeme Kalemleri</h3>

        {payments.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
            Tanımlı bir ödeme kalemi bulunamadı.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {payments.map((p) => {
              const remaining = p.baseAmount - p.paidAmount;
              const isPaid = p.status === 'PAID';
              const isPartial = p.status === 'PARTIAL';

              return (
                <div key={p.id} style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Vade: {p.dueDate ? new Date(p.dueDate).toLocaleDateString('tr-TR') : '-'}
                      </strong>
                      {p.rolledFromItemId && (
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--color-warning, #f59e0b)' }}>
                          (Devir Bakiye)
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: isPaid ? 'rgba(16, 185, 129, 0.15)' : isPartial ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isPaid ? 'var(--color-success, #10b981)' : isPartial ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)'
                    }}>
                      {isPaid ? 'ÖDENDİ' : isPartial ? 'KISMİ ÖDENDİ' : 'ÖDENMEDİ'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Tutar: <strong>{p.baseAmount} TRY</strong></span>
                    <span>Ödenen: <strong style={{ color: 'var(--color-success, #10b981)' }}>{p.paidAmount} TRY</strong></span>
                    <span>Kalan: <strong style={{ color: remaining > 0 ? 'var(--color-danger, #ef4444)' : 'inherit' }}>{remaining} TRY</strong></span>
                  </div>

                  {!isPaid && claimingItemId !== p.id && (
                    <div style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                      <Button size="sm" variant="outline" onClick={() => { setClaimingItemId(p.id); setClaimAmount(String(remaining)); }}>
                        Ödeme Yaptım Bildir ↗
                      </Button>
                    </div>
                  )}

                  {claimingItemId === p.id && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: 'var(--bg-card)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem' }}>Ödeme Bildirimi</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ödenen Tutar (TRY)</label>
                          <input 
                            type="number"
                            value={claimAmount}
                            onChange={(e) => setClaimAmount(e.target.value)}
                            style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dekont / Belge URL (Opsiyonel)</label>
                          <input 
                            type="text"
                            placeholder="https://..."
                            value={claimReceiptUrl}
                            onChange={(e) => setClaimReceiptUrl(e.target.value)}
                            style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Not</label>
                        <input 
                          type="text"
                          placeholder="Havale yapıldı / EFT no..."
                          value={claimNotes}
                          onChange={(e) => setClaimNotes(e.target.value)}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                        <Button size="sm" variant="ghost" onClick={() => setClaimingItemId(null)}>İptal</Button>
                        <Button size="sm" variant="primary" isLoading={claimMutation.isPending} onClick={() => handleClaimSubmit(p)}>
                          Bildirimi Gönder
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
