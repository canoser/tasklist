import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import styles from './StatisticsScreen.module.css';
import Heatmap from './Heatmap';
import statisticsService from '../../services/statisticsService';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatisticsScreen = ({ user, userId: propUserId, userName, onBack }) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { id: paramUserId } = useParams();

  const targetUserId = propUserId || paramUserId || user?.uid;
  const isMe = targetUserId === user?.uid;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!targetUserId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await statisticsService.getUserStatistics(targetUserId);
        setStats(data);
      } catch (err) {
        console.error('Stats error:', err);
        setError(err.response?.status === 403 ? t('ws_member_no_tasks') : t('err_upload_failed'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [targetUserId, t]);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={handleBack} className={styles.backBtn}>
          {t('btn_close')}
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for PieChart
  const pieData = Object.keys(stats.taskTypeBreakdown || {}).map(key => ({
    name: key,
    value: stats.taskTypeBreakdown[key]
  }));

  // Prepare data for Time Management BarChart
  const timeData = [
    { name: t('stats_on_time_rate'), value: stats.timeManagement?.onTime || 0, fill: '#00C49F' },
    { name: 'Geciken', value: stats.timeManagement?.late || 0, fill: '#FFBB28' }, // Hardcoded translation key missing, skipped
    { name: 'Kaçırılan', value: stats.timeManagement?.missed || 0, fill: '#FF8042' }
  ];

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className={styles.header}>
        {(!isMe || onBack) && (
          <button onClick={handleBack} className={styles.iconBtn}>
            <ArrowLeft size={24} />
          </button>
        )}
        <h1>{isMe ? t('stats_my_title') : t('stats_other_title', { name: userName || 'Öğrenci' })}</h1>
      </header>

      {stats.summary.TotalAssigned === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <p>{t('stats_empty')}</p>
        </div>
      ) : (
        <div className={styles.content}>
          
          {/* Ozet Kartları */}
          <section className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.summary.completionRate}%</span>
              <span className={styles.summaryLabel}>{t('stats_completed')}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.summary.currentStreak} 🔥</span>
              <span className={styles.summaryLabel}>{t('stats_current_streak')}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.summary.longestStreak}</span>
              <span className={styles.summaryLabel}>{t('stats_longest_streak')}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.summary.onTimeRate}%</span>
              <span className={styles.summaryLabel}>{t('stats_on_time_rate')}</span>
            </div>
          </section>

          {/* Isı Haritası */}
          <section className={styles.chartSection}>
            <h2>{t('stats_heatmap_title')}</h2>
            <div className={styles.heatmapWrapper}>
              <Heatmap data={stats.weeklyHeatmap} />
            </div>
          </section>

          <div className={styles.chartsGrid}>
            {/* Görev Dağılımı (Pie Chart) */}
            <section className={styles.chartSection}>
              <h2>{t('stats_task_types')}</h2>
              <div className={styles.chartWrapper}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={styles.noDataText}>Veri yok</p>
                )}
              </div>
            </section>

            {/* Zaman Yönetimi (Bar Chart) */}
            <section className={styles.chartSection}>
              <h2>{t('stats_time_mgmt')}</h2>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {timeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Net Skor Eğrisi (Line Chart) */}
          <section className={styles.chartSection}>
            <h2>{t('stats_net_trend')}</h2>
            <div className={styles.chartWrapper}>
              {stats.netScoreTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.netScoreTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="week" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="averageNetScore" stroke="#8884d8" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className={styles.noDataText}>Henüz performans kaydı (net hesaplaması) bulunmuyor.</p>
              )}
            </div>
          </section>

        </div>
      )}
    </motion.div>
  );
};

export default StatisticsScreen;
