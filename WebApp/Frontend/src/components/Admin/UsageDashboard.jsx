import React, { useState, useEffect } from 'react';
import { BarChart2, Cloud, Zap, DollarSign, RefreshCw, AlertCircle, Database, Server } from 'lucide-react';
import { getGlobalUsageMetrics } from '../../services/adminUsageService';
import { getSystemStats, getCloudflareStats } from '../../services/adminService';
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
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [cfStats, setCfStats] = useState(null);
  const [loadingCf, setLoadingCf] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageData, statsData] = await Promise.all([
        getGlobalUsageMetrics(),
        getSystemStats().catch(() => null)
      ]);
      setMetrics(usageData || []);
      setSystemStats(statsData);
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

  const handleCalculateCloudflare = async () => {
    setLoadingCf(true);
    try {
      const stats = await getCloudflareStats();
      setCfStats(stats);
    } catch (err) {
      console.error(err);
      alert("Cloudflare R2 verisi alınırken hata oluştu.");
    } finally {
      setLoadingCf(false);
    }
  };

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

      {/* SYSTEM STATS CARDS */}
      {systemStats && (
        <div className={styles.settingsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '30px' }}>
          <div className={styles.settingCard} style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>{t('stat_total_users', { context: tone })}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lbl_active', { context: tone, defaultValue: 'Aktif' })}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{systemStats.totalUsers}</div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lbl_deleted', { context: tone, defaultValue: 'Eski' })}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{systemStats.totalUsersDeleted}</div>
              </div>
            </div>
          </div>
          <div className={styles.settingCard} style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>{t('stat_premium_users', { context: tone })}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lbl_active', { context: tone, defaultValue: 'Aktif' })}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#eab308' }}>{systemStats.premiumUsers}</div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lbl_deleted', { context: tone, defaultValue: 'Eski' })}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{systemStats.premiumUsersDeleted}</div>
              </div>
            </div>
          </div>
          <div className={styles.settingCard} style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>{t('stat_total_workspaces', { context: tone })}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lbl_active', { context: tone, defaultValue: 'Aktif' })}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{systemStats.totalWorkspaces}</div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('lbl_deleted', { context: tone, defaultValue: 'Eski' })}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{systemStats.totalWorkspacesDeleted}</div>
              </div>
            </div>
          </div>
          <div className={styles.settingCard} style={{ textAlign: 'center', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>{t('stat_total_tasks', { context: tone })}</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>{systemStats.totalTasks}</div>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{t('stat_resource_costs', { context: tone })}</h3>
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
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Database size={12} /> {t('msg_neon_data', { context: tone })}
                  </p>
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

              {/* CLOUDFLARE R2 ÖZEL BÖLÜMÜ */}
              {metric.resourceType === 'FileStorage' && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                  {!cfStats ? (
                    <button 
                      onClick={handleCalculateCloudflare}
                      disabled={loadingCf}
                      style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: '500' }}
                    >
                      {loadingCf ? <RefreshCw size={16} className={styles.spinner} /> : <Server size={16} />}
                      {loadingCf ? t('msg_calculating', { context: tone }) : t('btn_calc_cloudflare', { context: tone })}
                    </button>
                  ) : (
                    <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Server size={12} /> {t('lbl_real_cloudflare_data', { context: tone })}
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{t('lbl_total_size', { context: tone })}</span><br/>
                          <strong>{(cfStats.totalSizeInBytes / (1024 * 1024)).toFixed(2)} MB</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{t('lbl_total_files', { context: tone })}</span><br/>
                          <strong>{cfStats.objectCount} {t('lbl_items', { context: tone, defaultValue: 'adet' })}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
