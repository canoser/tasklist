import { motion } from 'framer-motion';
import styles from './DashboardSummary.module.css';
import { useTranslation } from 'react-i18next';

// Not: Mock veriler tamamen kaldırıldı. Sadece gerçek veriler render edilecek.

// ── Düzenle İkonu ─────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

// ── Küçük Dairesel Grafik ─────────────────────────────────────────────────────
const MiniCircle = ({ percent, color, title, sub }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={styles.circleCard}>
      <div className={styles.circleWrap}>
        <svg className={styles.circleSvg} width="52" height="52" viewBox="0 0 52 52">
          <circle className={styles.circleTrack} cx="26" cy="26" r={radius} />
          <motion.circle
            className={styles.circleFill}
            cx="26"
            cy="26"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className={styles.circleInner}>
          <span className={styles.circlePercent}>{percent}%</span>
        </div>
      </div>
      <div className={styles.circleInfo}>
        <span className={styles.circleTitle}>{title}</span>
        <span className={styles.circleSub}>{sub}</span>
      </div>
    </div>
  );
};

// ── Animasyon varyantları ─────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  }),
};

// ── Ana DashboardSummary Bileşeni ─────────────────────────────────────────────
const DashboardSummary = ({ user, netScores = null, dailyGoals = null, dailyProgressData = 0, weeklyProgressData = 0 }) => {
  const { t } = useTranslation('tasks');
  const isGuest = !user?.id && !user?.uid;
  
  // Gerçek veriler veya 0/null
  const dailyProgress = dailyProgressData || 0;
  const weeklyProgress = weeklyProgressData || 0;
  const currentNetScores = netScores;
  const currentGoals = dailyGoals;

  return (
    <div className={styles.summarySection}>
      {/* Bölüm başlığı + Düzenle ikonu */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{t('summary_title', { defaultValue: 'Özet' })}</span>
        <button className={styles.editBtn} aria-label="Özeti Özelleştir" title="Gelecekte özelleştirme menüsü buraya gelecek">
          <EditIcon />
        </button>
      </div>

      {/* ── Üst Grid: Sol (2 Daire) + Sağ (Net Netleri) ── */}
      <div className={styles.topGrid}>
        {/* Sol: Günlük + Haftalık İlerleme */}
        <motion.div
          className={styles.progressCol}
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <MiniCircle
            percent={dailyProgress}
            color="#6366f1"
            title="Günlük İlerleme"
            sub="Bugün"
          />
          <MiniCircle
            percent={weeklyProgress}
            color="#10b981"
            title="Haftalık İlerleme"
            sub="Bu Hafta"
          />
        </motion.div>

        {/* Sağ: Son Deneme Netleri (sadece veri varsa render edilir) */}
        {currentNetScores && currentNetScores.length > 0 && (
          <motion.div
            className={`${styles.card} ${styles.netCard}`}
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <span className={styles.netCardTitle}>Son Deneme</span>
            {currentNetScores.map((s) => (
              <div key={s.subject} className={styles.netRow}>
                <span className={styles.netSubject}>{s.subject}</span>
                <div className={styles.netBar}>
                  <motion.div
                    className={styles.netBarFill}
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.net / s.maxNet) * 100}%` }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
                <span className={styles.netValue}>{s.net.toFixed(1)}</span>
              </div>
            ))}
            <span className={styles.netDate}>25 Tem 2026</span>
          </motion.div>
        )}
      </div>

      {/* ── Alt Bölüm: Günlük Hedefler (Tam Genişlik) ── */}
      {currentGoals && currentGoals.length > 0 && (
        <motion.div
          className={styles.goalsSection}
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <span className={styles.goalsSectionTitle}>Günlük Hedefler</span>
          <div className={styles.goalList}>
            {currentGoals.map((g) => {
              const pct = Math.round((g.done / g.total) * 100);
              return (
                <div key={g.label} className={styles.goalItem}>
                  <div className={styles.goalTop}>
                    <span className={styles.goalLabel}>{g.label}</span>
                    <span className={styles.goalPercent}>%{pct}</span>
                  </div>
                  <div className={styles.goalBar}>
                    <motion.div
                      className={styles.goalBarFill}
                      style={{ background: g.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardSummary;
