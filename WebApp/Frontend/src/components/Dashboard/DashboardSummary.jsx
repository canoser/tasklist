import { motion } from 'framer-motion';
import styles from './DashboardSummary.module.css';
import { useTranslation } from 'react-i18next';

// ── Mock Veri ─────────────────────────────────────────────────────────────────
const DAILY_PROGRESS = 80;
const WEEKLY_PROGRESS = 55;

// null ise "Son Deneme Netleri" kartı render edilmez
const NET_SCORES = [
  { subject: 'Mat', net: 28.5, maxNet: 40, color: '#6366f1' },
  { subject: 'Fiz', net: 14.0, maxNet: 20, color: '#10b981' },
  { subject: 'Kim', net: 11.5, maxNet: 20, color: '#f59e0b' },
  { subject: 'Bio', net: 9.25, maxNet: 20, color: '#a855f7' },
];

const DAILY_GOALS = [
  { label: 'Fizik: 50 Soru', done: 20, total: 50, color: '#10b981' },
  { label: 'Matematik: 30 Soru', done: 24, total: 30, color: '#6366f1' },
  { label: 'Kimya: 25 Soru', done: 5, total: 25, color: '#f59e0b' },
];

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
const DashboardSummary = ({ netScores = NET_SCORES }) => {
  const { t } = useTranslation('tasks');
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
            percent={DAILY_PROGRESS}
            color="#6366f1"
            title="Günlük İlerleme"
            sub="Bugün"
          />
          <MiniCircle
            percent={WEEKLY_PROGRESS}
            color="#10b981"
            title="Haftalık İlerleme"
            sub="Bu Hafta"
          />
        </motion.div>

        {/* Sağ: Son Deneme Netleri (sadece veri varsa render edilir) */}
        {netScores && netScores.length > 0 && (
          <motion.div
            className={`${styles.card} ${styles.netCard}`}
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <span className={styles.netCardTitle}>Son Deneme</span>
            {netScores.map((s) => (
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
      <motion.div
        className={styles.goalsSection}
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <span className={styles.goalsSectionTitle}>Günlük Hedefler</span>
        <div className={styles.goalList}>
          {DAILY_GOALS.map((g) => {
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
    </div>
  );
};

export default DashboardSummary;
