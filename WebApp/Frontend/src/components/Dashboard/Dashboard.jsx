import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import Timeline from './Timeline';
import DashboardSummary from './DashboardSummary';
import SmartAssistant from './SmartAssistant';
import { useTranslation } from 'react-i18next';

// ── Animasyon varyantları ─────────────────────────────────────────────────────
const greetingVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

// ── Dashboard Sayfası ─────────────────────────────────────────────────────────
const Dashboard = ({ user, tone }) => {
  const { t } = useTranslation('tasks');
  const displayName = user?.displayName || user?.email?.split('@')[0] || t('default_username', { ns: 'profile' });
  const [isAssistantVisible, setIsAssistantVisible] = useState(true);

  // Mock: Görev istatistikleri (ileride API'den gelecek)
  const totalTasks = 5;
  const completedTasks = 1;
  const remainingTasks = totalTasks - completedTasks;

  return (
    <>
      {/* Ana içerik */}
      <div className={styles.dashboard}>
        {/* Selamlama başlığı */}
        <motion.div
          className={styles.greeting}
          variants={greetingVariants}
          initial="hidden"
          animate="visible"
        >
          <p className={styles.greetingSub}>{t('greeting_morning', { context: tone })}</p>
          <h1 className={styles.greetingTitle}>
            {t('greeting_hello', { name: displayName, context: tone })}
          </h1>

          {/* Görev istatistik pilleri */}
          <div className={styles.statsRow}>
            <span className={`${styles.statPill} ${styles.active}`}>
              <span className={styles.statDot} />
              {t('stat_remaining', { count: remainingTasks, context: tone })}
            </span>
            <span className={styles.statPill}>
              <span className={styles.statDot} />
              {t('stat_completed', { count: completedTasks, context: tone })}
            </span>
          </div>
        </motion.div>

        {/* Dikey Zaman Çizelgesi */}
        <Timeline user={user} />

        {/* Alt Özet Kartları — scroll ile görünür */}
        <DashboardSummary />
      </div>

      {/* FAB + Onboarding Sihirbazı (fixed konumlu) */}
      <SmartAssistant
        isVisible={isAssistantVisible}
        onHide={() => setIsAssistantVisible(false)}
      />
    </>
  );
};

export default Dashboard;
