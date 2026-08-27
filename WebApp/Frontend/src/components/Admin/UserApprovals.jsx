import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, RefreshCw, AlertCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';
import styles from './AdminPanel.module.css';
import { useTranslation } from 'react-i18next';
import signalrService from '../../services/signalrService';

const UserApprovals = ({ settings, tone }) => {
  const { t } = useTranslation('admin');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // Default values from settings
  const defaultAiLimit = settings.find(s => s.key === 'AiTaskCreation')?.value || '5';
  const defaultStorageLimit = settings.find(s => s.key === 'FileStorage')?.value || '50';

  const [customLimits, setCustomLimits] = useState({});

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/users/pending');
      setPendingUsers(response.data);
      
      // Initialize custom limits for each user
      const initialLimits = {};
      response.data.forEach(u => {
        initialLimits[u.id] = {
          aiLimit: defaultAiLimit,
          storageLimit: defaultStorageLimit
        };
      });
      setCustomLimits(initialLimits);
    } catch (err) {
      console.error("Fetch pending users error:", err);
      setError(t('user_approvals_err_fetch', { context: tone }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();

    const handleUpdate = () => {
      fetchPendingUsers();
    };

    signalrService.addEventListener("PendingUsersUpdated", handleUpdate);
    return () => {
      signalrService.removeEventListener("PendingUsersUpdated", handleUpdate);
    };
  }, []);

  const handleLimitChange = (userId, field, value) => {
    setCustomLimits(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const handleApprove = async (userId) => {
    try {
      setApprovingId(userId);
      const limits = customLimits[userId];
      
      const payload = {
        customAiLimit: limits.aiLimit ? parseInt(limits.aiLimit, 10) : null,
        customStorageLimit: limits.storageLimit ? parseInt(limits.storageLimit, 10) : null
      };

      await apiClient.post(`/admin/users/${userId}/approve`, payload);
      
      // Remove from list
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error("Approve error:", err);
      alert(t('user_approvals_err_approve', { context: tone }));
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      setRejectingId(userId);
      await apiClient.delete(`/admin/users/${userId}`);
      
      // Remove from list
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error("Reject error:", err);
      alert("Kullanıcı silinirken bir hata oluştu.");
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={24} />
        <p>{t('loading_usage', { context: tone })}</p>
      </div>
    );
  }

  return (
    <div className={styles.sectionContainer} style={{ marginTop: '30px' }}>
      <div className={styles.sectionDivider}>
        <h2>{t('user_approvals_title', { context: tone })}</h2>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {pendingUsers.length === 0 && !error ? (
        <div className={styles.emptyState}>
          {t('user_approvals_empty', { context: tone })}
        </div>
      ) : (
        <div className={styles.settingsGrid}>
          {pendingUsers.map(user => (
            <div key={user.id} className={styles.settingCard}>
              <div className={styles.settingInfo}>
                <h3 style={{ marginBottom: '5px' }}>{user.name}</h3>
                <p style={{ color: 'var(--text2)' }}>{user.email}</p>
                <small style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: '10px' }}>
                  Kayıt: {new Date(user.createdAt).toLocaleString()}
                </small>
              </div>
              
              <div className={styles.settingAction} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', color: 'var(--text2)' }}>
                      AI Limiti
                    </label>
                    <input 
                      type="number"
                      className={styles.inputField}
                      style={{ width: '100%' }}
                      value={customLimits[user.id]?.aiLimit || ''}
                      onChange={(e) => handleLimitChange(user.id, 'aiLimit', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', color: 'var(--text2)' }}>
                      Depolama (MB)
                    </label>
                    <input 
                      type="number"
                      className={styles.inputField}
                      style={{ width: '100%' }}
                      value={customLimits[user.id]?.storageLimit || ''}
                      onChange={(e) => handleLimitChange(user.id, 'storageLimit', e.target.value)}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button 
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingId === user.id || rejectingId === user.id}
                    className={styles.saveBtn}
                    style={{ flex: 1, justifyContent: 'center', backgroundColor: '#10b981', color: '#fff' }}
                  >
                    {approvingId === user.id ? (
                      <RefreshCw size={18} className={styles.spinner} />
                    ) : (
                      <>
                        <UserCheck size={18} />
                        <span>{t('user_approvals_btn_approve', { context: tone, defaultValue: 'Onayla' })}</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => handleReject(user.id)}
                    disabled={approvingId === user.id || rejectingId === user.id}
                    className={styles.saveBtn}
                    style={{ flex: 1, justifyContent: 'center', backgroundColor: '#ef4444', color: '#fff' }}
                  >
                    {rejectingId === user.id ? (
                      <RefreshCw size={18} className={styles.spinner} />
                    ) : (
                      <>
                        <UserX size={18} />
                        <span>{t('user_approvals_btn_reject', { context: tone, defaultValue: 'Sil' })}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserApprovals;
