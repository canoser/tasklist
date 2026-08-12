import React, { useState, useEffect } from 'react';
import { BarChart2, Cloud, Zap, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { getGlobalUsageMetrics } from '../../services/adminUsageService';
import styles from './AdminPanel.module.css';

const UNIT_COSTS = {
  AiTaskCreation: 0.002, // 1 AI Task creation cost estimated
  AiCommand: 0.005,      // 1 AI Chat command cost estimated
  FileStorage: 0.0001,   // 1 MB Storage cost estimated (Cloudflare R2)
};

const UsageDashboard = () => {
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
      setError("Kullanım verileri çekilirken bir hata oluştu.");
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
        <p>Kullanım ve Maliyet Verileri Yükleniyor...</p>
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
          <h2>Kullanım ve Maliyet Özeti</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Tüm kullanıcıların platform genelindeki toplam tüketimleri ve tahmini faturanız.
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
            label = 'AI Görev Oluşturma';
          } else if (metric.resourceType === 'AiCommand') {
            icon = <Zap size={24} style={{ color: '#3b82f6' }} />;
            label = 'AI Sohbet Komutları';
          } else if (metric.resourceType === 'FileStorage') {
            icon = <Cloud size={24} style={{ color: '#06b6d4' }} />;
            label = 'Bulut Depolama (R2)';
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
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Farklı Kullanıcı: {metric.totalUsers}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Toplam Kullanım</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {metric.totalUsedAmount.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>{unit}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Tahmini Maliyet</p>
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
            Henüz sisteme kaydedilmiş herhangi bir kaynak kullanımı bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageDashboard;
