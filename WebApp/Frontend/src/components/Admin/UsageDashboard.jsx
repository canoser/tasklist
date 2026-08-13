import React, { useState, useEffect } from 'react';
import { BarChart2, Cloud, Zap, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { getGlobalUsageMetrics } from '../../services/adminUsageService';
import styles from './AdminPanel.module.css';
import { useTranslation } from 'react-i18next';

const UNIT_COSTS = {
  AiTaskCreation: 0.002, // 1 AI Task creation cost estimated
  AiCommand: 0.005,      // 1 AI Chat command cost estimated
  FileStorage: 0.0001,   // 1 MB Storage cost estimated (Cloudflare R2)
};

const UsageDashboard = ({ tone }) => {
  const { t } = useTranslation('admin');
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGlobalUsageMetrics();
      setMetrics(data || []);
    } catch (err) {
      console.error("Metrics fetch error:", err);
      setError(t('err_fetch_usage', { context: tone }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const calculateCost = (resourceType, amount) => {
    const costPerUnit = UNIT_COSTS[resourceType] || 0;
    return (costPerUnit * amount).toFixed(2);
  };

  const totalCost = metrics.reduce((acc, curr) => {
    return acc + parseFloat(calculateCost(curr.resourceType, curr.totalUsedAmount));
  }, 0).toFixed(2);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={24} />
        <p>{t('loading_usage', { context: tone })}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorAlert}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={styles.usageContainer} style={{ marginTop: '20px' }}>
      <div className={styles.usageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>{t('usage_title', { context: tone })}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            {t('usage_subtitle', { context: tone })}
          </p>
        </div>
        <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={20} /> {totalCost} USD
        </div>
      </div>

      <div className={styles.settingsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {metrics.map((metric) => {
          let icon = <BarChart2 />;
          let label = metric.resourceType;
          let unit = 'adet';

          if (metric.resourceType === 'AiTaskCreation') {
            icon = <Zap size={24} style={{ color: '#eab308' }} />;
            label = t('resource_ai_task', { context: tone });
          } else if (metric.resourceType === 'AiCommand') {
            icon = <Zap size={24} style={{ color: '#3b82f6' }} />;
            label = t('resource_ai_cmd', { context: tone });
          } else if (metric.resourceType === 'FileStorage') {
            icon = <Cloud size={24} style={{ color: '#06b6d4' }} />;
            label = t('resource_storage', { context: tone });
            unit = 'MB';
          }

          const cost = calculateCost(metric.resourceType, metric.totalUsedAmount);

          return (
            <div key={metric.resourceType} className={styles.settingCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                  {icon}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{label}</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{t('stat_users', { context: tone, count: metric.totalUsers })}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{t('stat_total_usage', { context: tone })}</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {metric.totalUsedAmount.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>{unit}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{t('stat_est_cost', { context: tone })}</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                    ${cost}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {metrics.length === 0 && (
          <div className={styles.emptyState}>
            {t('usage_empty', { context: tone })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageDashboard;
