import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { getSettings, updateSetting } from '../../services/adminSettingsService';
import QuotaSimulator from './QuotaSimulator';
import UserApprovals from './UserApprovals';
import UserSearch from './UserSearch';
import UsageDashboard from './UsageDashboard';
import WorkspaceManagement from './WorkspaceManagement';
import GuideModal from '../Common/GuideModal';
import styles from './AdminPanel.module.css';

import CalendarDataManager from './CalendarDataManager';
import { useTranslation } from 'react-i18next';

const AdminPanel = ({ tone }) => {
  const { t } = useTranslation('admin');
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'usage', 'users', 'workspaces', 'data'
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Settings fetch error:", err);
      setError(t('err_fetch_settings', { context: tone }));
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
      
      setSuccessMsg(t('msg_save_success', { context: tone, key }));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Setting update error:", err);
      setError(t('msg_save_fail', { context: tone, key }));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={32} />
        <p>{t('loading_settings', { context: tone })}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <div className={styles.headerTitle}>
              <Settings size={28} className={styles.headerIcon} />
              <h1>{t('admin_panel_title', { context: tone })}</h1>
            </div>
            <p className={styles.headerSubtitle}>{t('admin_panel_subtitle', { context: tone })}</p>
          </div>
          <button 
            onClick={() => setIsGuideOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <HelpCircle size={18} />
            <span>Kılavuz</span>
          </button>
        </div>
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
      <div 
        style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '20px', 
          borderBottom: '1px solid var(--border)', 
          paddingBottom: '10px', 
          overflowX: 'auto', 
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE 10+
        }}
        className={styles.hideScrollbar} // In case we want to add CSS rules
      >
        <button 
          onClick={() => setActiveTab('settings')}
          style={{ flexShrink: 0, padding: '8px 16px', background: activeTab === 'settings' ? 'var(--accent)' : 'transparent', color: activeTab === 'settings' ? 'white' : 'var(--text2)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t('tab_settings', { context: tone })}
        </button>
        <button 
          onClick={() => setActiveTab('usage')}
          style={{ flexShrink: 0, padding: '8px 16px', background: activeTab === 'usage' ? 'var(--accent)' : 'transparent', color: activeTab === 'usage' ? 'white' : 'var(--text2)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t('tab_usage', { context: tone })}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ flexShrink: 0, padding: '8px 16px', background: activeTab === 'users' ? 'var(--accent)' : 'transparent', color: activeTab === 'users' ? 'white' : 'var(--text2)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t('tab_users', { context: tone })}
        </button>
        <button 
          onClick={() => setActiveTab('workspaces')}
          style={{ flexShrink: 0, padding: '8px 16px', background: activeTab === 'workspaces' ? 'var(--accent)' : 'transparent', color: activeTab === 'workspaces' ? 'white' : 'var(--text2)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t('tab_workspaces', { context: tone, defaultValue: 'Alanlar' })}
        </button>
        <button 
          onClick={() => setActiveTab('data')}
          style={{ flexShrink: 0, padding: '8px 16px', background: activeTab === 'data' ? 'var(--accent)' : 'transparent', color: activeTab === 'data' ? 'white' : 'var(--text2)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t('tab_data', { context: tone })}
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
                    <span>{t('btn_save', { context: tone })}</span>
                  </>
                )}
              </button>
            </div>
            <div className={styles.lastUpdated}>
              {t('lbl_last_updated', { context: tone, date: new Date(setting.updatedAt).toLocaleString() })}
            </div>
          </div>
        ))}
            {settings.length === 0 && !error && (
              <div className={styles.emptyState}>
                {t('lbl_empty_settings', { context: tone })}
              </div>
            )}
          </div>

          <div className={styles.sectionDivider}>
            <h2>{t('lbl_test_tools', { context: tone })}</h2>
          </div>
          
          <QuotaSimulator resourceType="AiTaskCreation" tone={tone} />
        </>
      )}

      {activeTab === 'usage' && (
        <UsageDashboard tone={tone} />
      )}

      {activeTab === 'users' && (
        <>
          <UserSearch tone={tone} />
          <UserApprovals settings={settings} tone={tone} />
        </>
      )}

      {activeTab === 'workspaces' && (
        <WorkspaceManagement tone={tone} />
      )}

      {activeTab === 'data' && (
        <CalendarDataManager tone={tone} />
      )}

      <GuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        titleKey={`guide_title_${activeTab}`}
        contentKeys={[`guide_content_${activeTab}_1`, `guide_content_${activeTab}_2`, `guide_content_${activeTab}_3`]}
        tone={tone}
      />
    </div>
  );
};

export default AdminPanel;
