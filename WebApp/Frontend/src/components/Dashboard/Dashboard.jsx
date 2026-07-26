import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import Timeline from './Timeline';
import DashboardSummary from './DashboardSummary';
import SmartAssistant from './SmartAssistant';

// ── Animasyon varyantları ─────────────────────────────────────────────────────
const greetingVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

// ── Dashboard Sayfası ─────────────────────────────────────────────────────────
const Dashboard = ({ user }) => {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Öğrenci';
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
          <p className={styles.greetingSub}>Günaydın 🌤️</p>
          <h1 className={styles.greetingTitle}>
            Merhaba, <span>{displayName}</span>!
          </h1>

          {/* Görev istatistik pilleri */}
          <div className={styles.statsRow}>
            <span className={`${styles.statPill} ${styles.active}`}>
              <span className={styles.statDot} />
              {remainingTasks} Görev kaldı
            </span>
            <span className={styles.statPill}>
              <span className={styles.statDot} />
              {completedTasks} Tamamlandı
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
