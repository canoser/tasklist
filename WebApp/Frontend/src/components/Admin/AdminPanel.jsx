import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { getSettings, updateSetting } from '../../services/adminSettingsService';
import QuotaSimulator from './QuotaSimulator';
import UserApprovals from './UserApprovals';
import UsageDashboard from './UsageDashboard';
import styles from './AdminPanel.module.css';

const AdminPanel = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'usage', 'users'

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Settings fetch error:", err);
      setError("Ayarlar yüklenirken bir hata oluştu. Lütfen yetkinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValueChange = (key, newValue) => {
    setSettings(prev => 
      prev.map(s => s.key === key ? { ...s, value: newValue } : s)
    );
  };

  const handleSave = async (key, value, description) => {
    try {
      setSavingKey(key);
      setError(null);
      setSuccessMsg('');
      
      await updateSetting(key, value, description);
      
      setSuccessMsg(`${key} ayarı başarıyla güncellendi!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Setting update error:", err);
      setError(`${key} güncellenemedi.`);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={32} />
        <p>Sistem Ayarları Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Settings size={28} className={styles.headerIcon} />
          <h1>Sistem Yönetim Paneli</h1>
        </div>
        <p className={styles.headerSubtitle}>SaaS Kotaları ve Uygulama Sınırları</p>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className={styles.successAlert}>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Sekmeler (Tabs) ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('settings')}
          style={{ padding: '8px 16px', background: activeTab === 'settings' ? 'var(--accent-primary)' : 'transparent', color: activeTab === 'settings' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Sistem Ayarları
        </button>
        <button 
          onClick={() => setActiveTab('usage')}
          style={{ padding: '8px 16px', background: activeTab === 'usage' ? 'var(--accent-primary)' : 'transparent', color: activeTab === 'usage' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Kullanım & Maliyet
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ padding: '8px 16px', background: activeTab === 'users' ? 'var(--accent-primary)' : 'transparent', color: activeTab === 'users' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Kullanıcı Yönetimi
        </button>
      </div>

      {activeTab === 'settings' && (
        <>
          <div className={styles.settingsGrid}>
            {settings.map((setting) => (
              <div key={setting.key} className={styles.settingCard}>
            <div className={styles.settingInfo}>
              <h3>{setting.key}</h3>
              <p>{setting.description}</p>
            </div>
            <div className={styles.settingAction}>
              <input 
                type="text" 
                value={setting.value}
                onChange={(e) => handleValueChange(setting.key, e.target.value)}
                className={styles.inputField}
              />
              <button 
                onClick={() => handleSave(setting.key, setting.value, setting.description)}
                disabled={savingKey === setting.key}
                className={styles.saveBtn}
              >
                {savingKey === setting.key ? (
                  <RefreshCw size={18} className={styles.spinner} />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Kaydet</span>
                  </>
                )}
              </button>
            </div>
            <div className={styles.lastUpdated}>
              Son güncelleme: {new Date(setting.updatedAt).toLocaleString()}
            </div>
          </div>
        ))}
            {settings.length === 0 && !error && (
              <div className={styles.emptyState}>
                Sistem ayarı bulunamadı.
              </div>
            )}
          </div>

          <div className={styles.sectionDivider}>
            <h2>Test Araçları</h2>
          </div>
          
          <QuotaSimulator resourceType="AiTaskCreation" />
        </>
      )}

      {activeTab === 'usage' && (
        <UsageDashboard />
      )}

      {activeTab === 'users' && (
        <UserApprovals settings={settings} />
      )}
    </div>
  );
};

export default AdminPanel;
