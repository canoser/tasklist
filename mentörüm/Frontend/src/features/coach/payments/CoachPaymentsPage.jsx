import React, { useState, useMemo } from 'react';
import { usePrograms } from '../coachSchoolApi';
import { usePaymentPlans, useCollectPayment } from '../coachApi';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Check } from 'lucide-react';
import styles from './CoachPaymentsPage.module.css';

export default function CoachPaymentsPage() {
  const { data: programs = [] } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, OVERDUE, PAID

  const activeProgramId = selectedProgramId === 'all' ? undefined : selectedProgramId;
  const { data: plans = [], isLoading } = usePaymentPlans(activeProgramId);
  const collectPaymentMutation = useCollectPayment(activeProgramId);

  // Metrikler
  const stats = useMemo(() => {
    let totalPlanned = 0;
    let totalCollected = 0;
    let totalOverdue = 0;
    let pendingCount = 0;

    plans.forEach(plan => {
      (plan.items || []).forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        totalPlanned += amt;
        if (item.status === 'PAID') {
          totalCollected += amt;
        } else {
          pendingCount++;
          const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
          if (isOverdue) totalOverdue += amt;
        }
      });
    });

    return {
      totalPlanned,
      totalCollected,
      totalOverdue,
      pendingCount
    };
  }, [plans]);

  const handleCollect = (item) => {
    if (!item?.id) return;
    collectPaymentMutation.mutate({
      itemId: item.id,
      amount: item.amount,
      method: 'CASH'
    });
  };

  const filteredPlans = useMemo(() => {
    if (filterStatus === 'ALL') return plans;
    return plans.map(p => {
      const items = (p.items || []).filter(item => {
        const isOverdue = item.status !== 'PAID' && item.dueDate && new Date(item.dueDate) < new Date();
        if (filterStatus === 'PAID') return item.status === 'PAID';
        if (filterStatus === 'OVERDUE') return isOverdue;
        if (filterStatus === 'PENDING') return item.status === 'PENDING' && !isOverdue;
        return true;
      });
      return { ...p, items };
    }).filter(p => p.items.length > 0);
  }, [plans, filterStatus]);

  return (
    <div className={styles.container}>
      {/* Başlık ve Program Seçici */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Finans & Tahsilat Yönetimi</h1>
          <p className={styles.subtitle}>Öğrenci ödeme planları, tahsilatlar ve geciken taksit takibi</p>
        </div>

        {programs.length > 1 && (
          <div className={styles.programSelector}>
            <label className={styles.kpiLabel}>Program:</label>
            <select
              className={styles.selectInput}
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
            >
              <option value="all">🌐 Tüm Programlar</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Kartları */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>TOPLAM PLANLANAN</span>
          <div className={styles.kpiValue}>₺{stats.totalPlanned.toLocaleString('tr-TR')}</div>
          <span className={styles.kpiSubtext}>{plans.length} Aktif Ödeme Planı</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>TAHSİL EDİLEN</span>
          <div className={`${styles.kpiValue} ${styles.successValue}`}>
            ₺{stats.totalCollected.toLocaleString('tr-TR')}
          </div>
          <span className={styles.kpiSubtext}>Tamamlanan ödemeler</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>GECİKEN TAHSİLAT</span>
          <div className={`${styles.kpiValue} ${stats.totalOverdue > 0 ? styles.alertValue : ''}`}>
            ₺{stats.totalOverdue.toLocaleString('tr-TR')}
          </div>
          <span className={styles.kpiSubtext}>
            {stats.totalOverdue > 0 ? '⚠️ Vadesi geçmiş taksitler' : 'Gecikmiş taksit bulunmuyor'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>BEKLEYEN İŞLEM</span>
          <div className={styles.kpiValue}>{stats.pendingCount} Taksit</div>
          <span className={styles.kpiSubtext}>Ödeme bekleyen taksit sayısı</span>
        </div>
      </div>

      {/* Ödeme Planları Listesi */}
      <div className={styles.plansSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ödeme Planları & Taksitler</h2>

          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterStatus === 'ALL' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              Tümü
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterStatus === 'PENDING' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus('PENDING')}
            >
              Bekleyenler
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterStatus === 'OVERDUE' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus('OVERDUE')}
            >
              Gecikenler
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterStatus === 'PAID' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus('PAID')}
            >
              Tahsil Edilenler
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.emptyNotice}>Ödeme planları yükleniyor...</div>
        ) : filteredPlans.length > 0 ? (
          <div className={styles.plansList}>
            {filteredPlans.map(plan => {
              const studentInitial = plan.studentName?.charAt(0)?.toUpperCase() || 'Ö';
              return (
                <div key={plan.id} className={styles.planCard}>
                  <div className={styles.planCardHeader}>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentAvatar}>{studentInitial}</div>
                      <span className={styles.studentName}>{plan.studentName || 'Öğrenci'}</span>
                    </div>
                    <span className={styles.planTotalBadge}>
                      Toplam: ₺{parseFloat(plan.totalAmount || 0).toLocaleString('tr-TR')}
                    </span>
                  </div>

                  <div className={styles.itemsGrid}>
                    {(plan.items || []).map(item => {
                      const isPaid = item.status === 'PAID';
                      const isOverdue = !isPaid && item.dueDate && new Date(item.dueDate) < new Date();
                      return (
                        <div key={item.id} className={styles.itemCard}>
                          <div className={styles.itemTop}>
                            <span className={styles.itemDueDate}>
                              Vade: {item.dueDate ? format(new Date(item.dueDate), 'd MMMM yyyy', { locale: tr }) : 'Belirtilmedi'}
                            </span>
                            <span
                              className={`
                                ${styles.itemStatusBadge}
                                ${isPaid ? styles.statusPaid : isOverdue ? styles.statusOverdue : styles.statusPending}
                              `}
                            >
                              {isPaid ? 'Ödendi' : isOverdue ? 'Gecikti' : 'Bekliyor'}
                            </span>
                          </div>

                          <div className={styles.itemAmountRow}>
                            <span className={styles.itemAmount}>
                              ₺{parseFloat(item.amount || 0).toLocaleString('tr-TR')}
                            </span>
                            {!isPaid && (
                              <button
                                type="button"
                                className={styles.collectBtn}
                                onClick={() => handleCollect(item)}
                                title="Tahsil edildi olarak kaydet"
                              >
                                <Check size={13} strokeWidth={2.5} />
                                <span>Tahsil Et</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyNotice}>
            Seçili kriterlere uygun ödeme planı veya taksit bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
