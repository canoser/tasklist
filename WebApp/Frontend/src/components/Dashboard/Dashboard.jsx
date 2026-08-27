import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import Timeline from './Timeline';
import DashboardSummary from './DashboardSummary';
import SmartAssistant from './SmartAssistant';
import AiCommandModal from './AiCommandModal';
import { useTranslation } from 'react-i18next';

// ── Animasyon varyantları ─────────────────────────────────────────────────────
const greetingVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

// ── Dashboard Sayfası ─────────────────────────────────────────────────────────
const Dashboard = ({ user, guestName, tone }) => {
  const { t } = useTranslation('tasks');
  const displayName = user?.displayName || user?.email?.split('@')[0] || guestName || t('default_username', { ns: 'profile' });
  const [isAssistantVisible, setIsAssistantVisible] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [taskStats, setTaskStats] = useState({ remaining: 3, completed: 1 });

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
              {t('stat_remaining', { count: taskStats.remaining, context: tone })}
            </span>
            <span className={styles.statPill}>
              <span className={styles.statDot} />
              {t('stat_completed', { count: taskStats.completed, context: tone })}
            </span>
          </div>
        </motion.div>

        {/* Dikey Zaman Çizelgesi */}
        <Timeline user={user} tone={tone} onStatsChange={setTaskStats} />

        {/* Alt Özet Kartları — scroll ile görünür */}
        <DashboardSummary />
      </div>

      {/* FAB + Onboarding Sihirbazı (fixed konumlu) */}
      <SmartAssistant
        isVisible={isAssistantVisible}
        onHide={() => setIsAssistantVisible(false)}
        onOpenAi={() => { setIsAssistantVisible(false); setIsAiModalOpen(true); }}
      />

      <AiCommandModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        workspaceId={1} 
      />
    </>
  );
};

export default Dashboard;
