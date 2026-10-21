import React, { useState, useMemo } from 'react';
import { usePrograms } from '../coachSchoolApi';
import { usePaymentPlans, useCollectPayment, useStudents, useCreatePaymentPlan } from '../coachApi';
import Button from '../../../components/common/Button/Button';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Check, Plus } from 'lucide-react';
import styles from './CoachPaymentsPage.module.css';

export default function CoachPaymentsPage() {
  const { data: programs = [] } = usePrograms();
  const { data: students = [] } = useStudents();
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, OVERDUE, PAID

  const activeProgramId = selectedProgramId === 'all' ? undefined : selectedProgramId;
  const { data: plans = [], isLoading } = usePaymentPlans(activeProgramId);
  const collectPaymentMutation = useCollectPayment(activeProgramId);
  const createPaymentPlanMutation = useCreatePaymentPlan(activeProgramId);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formProgramId, setFormProgramId] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formPeriodType, setFormPeriodType] = useState('MONTHLY_DAY');
  const [formAmount, setFormAmount] = useState('');
  const [formMonthDay, setFormMonthDay] = useState(1);
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formError, setFormError] = useState('');

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

  const handleOpenCreateModal = () => {
    setFormProgramId(selectedProgramId !== 'all' ? selectedProgramId : (programs[0]?.id || ''));
    setFormStudentId(students[0]?.id || '');
    setFormAmount('');
    setFormMonthDay(1);
    setFormStartDate(format(new Date(), 'yyyy-MM-dd'));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formProgramId) {
      setFormError('Lütfen bir program seçin.');
      return;
    }
    if (!formStudentId) {
      setFormError('Lütfen bir öğrenci seçin.');
      return;
    }
    if (!formAmount || parseFloat(formAmount) <= 0) {
      setFormError('Lütfen geçerli bir tutar girin.');
      return;
    }

    try {
      await createPaymentPlanMutation.mutateAsync({
        programId: formProgramId,
        studentId: formStudentId,
        periodType: formPeriodType,
        amount: parseFloat(formAmount),
        monthDay: formPeriodType === 'MONTHLY_DAY' ? parseInt(formMonthDay, 10) : null,
        startDate: formStartDate,
        currency: 'TRY'
      });
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Ödeme planı oluşturulamadı.');
    }
  };

  const filteredStudentsForModal = useMemo(() => {
    if (!formProgramId) return students;
    return students.filter(s => s.programId === formProgramId);
  }, [students, formProgramId]);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {programs.length > 1 && (
            <div className={styles.programSelector}>
              <label className={styles.kpiLabel}>Program:</label>
              <select
                className={styles.selectInput}
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
              >
                <option value="all">Tüm Programlar</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className={plans.length === 0 ? styles.topCreateBtnWhenEmpty : ''}
          >
            <Plus size={16} />
            <span>Ödeme Planı Oluştur</span>
          </Button>
        </div>
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
          <span className={styles.kpiSubtext} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {stats.totalOverdue > 0 && <AlertTriangle size={13} style={{ color: '#ef4444' }} />}
            {stats.totalOverdue > 0 ? 'Vadesi geçmiş taksitler' : 'Gecikmiş taksit bulunmuyor'}
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
          <div className={styles.emptyNotice} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '36px 16px' }}>
            <span>Seçili kriterlere uygun ödeme planı veya taksit bulunamadı.</span>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus size={14} />
              <span>Ödeme Planı Oluştur</span>
            </Button>
          </div>
        )}
      </div>

      {/* Ödeme Planı Oluşturma Modalı */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Ödeme Planı Oluştur">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }}>
          {formError && (
            <div style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>{formError}</div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Program
            </label>
            <select
              value={formProgramId}
              onChange={(e) => setFormProgramId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color-surface)', color: 'var(--text-color-main)' }}
              required
            >
              <option value="">Program Seçin...</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Öğrenci
            </label>
            <select
              value={formStudentId}
              onChange={(e) => setFormStudentId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color-surface)', color: 'var(--text-color-main)' }}
              required
            >
              <option value="">Öğrenci Seçin...</option>
              {filteredStudentsForModal.map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Periyot Türü
            </label>
            <select
              value={formPeriodType}
              onChange={(e) => setFormPeriodType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color-surface)', color: 'var(--text-color-main)' }}
              required
            >
              <option value="MONTHLY_DAY">Aylık (Her Ayın Belirli Günü)</option>
              <option value="FOUR_WEEK">4 Haftalık</option>
              <option value="PER_LESSON">Ders Başına</option>
              <option value="PER_SESSION">Seans Başına</option>
            </select>
          </div>

          <Input
            label="Taksit / Dönem Tutarı (₺)"
            type="number"
            min="1"
            step="0.01"
            placeholder="Örn: 2500"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            required
          />

          {formPeriodType === 'MONTHLY_DAY' && (
            <Input
              label="Ayın Günü (1-31)"
              type="number"
              min="1"
              max="31"
              value={formMonthDay}
              onChange={(e) => setFormMonthDay(e.target.value)}
              required
            />
          )}

          <Input
            label="Başlangıç Tarihi"
            type="date"
            value={formStartDate}
            onChange={(e) => setFormStartDate(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button type="submit" variant="primary" isLoading={createPaymentPlanMutation.isPending}>
              Planı Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
