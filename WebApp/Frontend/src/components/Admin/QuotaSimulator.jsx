import React, { useState, useEffect } from 'react';
import { Play, Video, WifiOff, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { getQuotaStatus, simulateDeductQuota, grantReward } from '../../services/quotaService';
import styles from './QuotaSimulator.module.css';

const QuotaSimulator = ({ resourceType = 'AiTaskCreation' }) => {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // [MOBILE_PORT_TODO]: navigator.onLine iOS'ta güvenilmez. @capacitor/network ile değiştirilmeli.
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadQuota = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuotaStatus(resourceType);
      setQuota(data);
    } catch (err) {
      console.error('Quota load error:', err);
      setError('Kota bilgisi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuota();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [resourceType]);

  const handleSimulateDeduct = async () => {
    if (isOffline) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg('');
      const res = await simulateDeductQuota(resourceType);
      setSuccessMsg(res.message || '1 Hak kullanıldı.');
      await loadQuota();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Deduct error:', err);
      if (err.response && err.response.status === 429) {
        setError(err.response.data.message || 'Kota doldu!');
      } else {
        setError('Kota düşümü başarısız oldu.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleWatchAd = async () => {
    if (isOffline) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg('');
      const res = await grantReward(resourceType, 'DEV_TEST_TOKEN');
      setSuccessMsg(res.message || '+5 Hak kazandınız!');
      await loadQuota();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Reward error:', err);
      if (err.response && err.response.status === 429) {
        setError(err.response.data.message || 'Günlük reklam limitiniz doldu.');
      } else {
        setError(err.response.data?.message || 'Reklam ödülü alınamadı.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (!quota && loading) {
    return (
      <div className={styles.simulatorCard}>
        <div className={styles.header}>
          <RefreshCw className={styles.spinner} size={20} />
          <h2>Kota Yükleniyor...</h2>
        </div>
      </div>
    );
  }

  if (!quota) return null;

  const totalLimit = quota.baseLimit + quota.earnedLimit;
  const usagePercentage = totalLimit > 0 ? (quota.used / totalLimit) * 100 : 0;
  const isDanger = usagePercentage >= 90;

  return (
    <div className={styles.simulatorCard}>
      <div className={styles.header}>
        <Activity size={24} className={styles.headerIcon} />
        <h2>{resourceType} Kota Simülatörü</h2>
      </div>

      {isOffline && (
        <div className={styles.offlineAlert}>
          <WifiOff size={20} />
          <span>İşlem için internet bağlantısı gerekiyor. Çevrimdışı moddasınız.</span>
        </div>
      )}

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className={styles.successAlert}>
          <span>{successMsg}</span>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <span>Taban Limit</span>
          <strong>{quota.baseLimit}</strong>
        </div>
        <div className={styles.statBox}>
          <span>Kazanılan (Ad)</span>
          <strong>+{quota.earnedLimit}</strong>
        </div>
        <div className={styles.statBox}>
          <span>Kalan Hak</span>
          <strong>{quota.remaining}</strong>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressLabels}>
          <span>Kullanılan: <strong>{quota.used}</strong> / {totalLimit}</span>
          <span>%{Math.round(usagePercentage)}</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div 
            className={`${styles.progressUsed} ${isDanger ? styles.danger : ''}`} 
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className={styles.actionSection}>
        <button 
          onClick={handleSimulateDeduct} 
          disabled={isOffline || actionLoading || quota.remaining <= 0}
          className={`${styles.actionBtn} ${styles.deductBtn}`}
        >
          {actionLoading ? <RefreshCw size={18} className={styles.spinner} /> : <Play size={18} />}
          Simüle Et (-1)
        </button>

        <button 
          onClick={handleWatchAd} 
          disabled={isOffline || actionLoading || !quota.adsEnabled}
          className={`${styles.actionBtn} ${styles.rewardBtn}`}
          title={!quota.adsEnabled ? "Reklamlar şu an devre dışı." : ""}
        >
          {actionLoading ? <RefreshCw size={18} className={styles.spinner} /> : <Video size={18} />}
          Reklam İzle (+5)
        </button>
      </div>
    </div>
  );
};

export default QuotaSimulator;
