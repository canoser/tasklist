import React, { useState } from 'react';
import { Search, Save, AlertCircle } from 'lucide-react';
import { searchUsers, updateUserLimits } from '../../services/adminService';
import styles from './AdminPanel.module.css';
import { useTranslation } from 'react-i18next';

const UserSearch = ({ tone }) => {
  const { t } = useTranslation('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [editForm, setEditForm] = useState({
    SubscriptionPlan: 'free',
    CustomAiLimit: '',
    CustomStorageLimit: '',
    CustomWorkspaceLimit: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const results = await searchUsers(searchQuery);
      setUsers(results);
    } catch (e) {
      console.error(e);
    }
  };

  const openUserEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      SubscriptionPlan: user.subscriptionPlan || 'free',
      CustomAiLimit: user.customAiLimit ?? '',
      CustomStorageLimit: user.customStorageLimit ?? '',
      CustomWorkspaceLimit: user.customWorkspaceLimit ?? ''
    });
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      const payload = {
        SubscriptionPlan: editForm.SubscriptionPlan,
        CustomAiLimit: editForm.CustomAiLimit === '' ? null : parseInt(editForm.CustomAiLimit),
        CustomStorageLimit: editForm.CustomStorageLimit === '' ? null : parseInt(editForm.CustomStorageLimit),
        CustomWorkspaceLimit: editForm.CustomWorkspaceLimit === '' ? null : parseInt(editForm.CustomWorkspaceLimit)
      };
      await updateUserLimits(selectedUser.id, payload);
      alert("Kullanıcı limitleri başarıyla güncellendi.");
      setSelectedUser(null);
      handleSearch(new Event('submit'));
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  return (
    <div className={styles.sectionContainer} style={{ marginTop: '30px' }}>
      <div className={styles.sectionDivider}>
        <h2>Kullanıcı Arama ve Limit Yönetimi</h2>
      </div>
      <p style={{ color: 'var(--text2)', marginBottom: '15px' }}>
        Sistemdeki herhangi bir kullanıcıyı e-posta adresiyle bulun, yetkilerini (Premium) ve özel kotalarını anında değiştirin.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="E-posta adresi ile ara..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.inputField}
          style={{ flex: 1 }}
        />
        <button type="submit" className={styles.saveBtn} style={{ background: 'var(--accent)', color: 'white' }}>
          <Search size={18} /> Ara
        </button>
      </form>

      {users.length > 0 && (
        <div className={styles.settingsGrid}>
          {users.map(user => (
            <div key={user.id} className={styles.settingCard}>
              <div className={styles.settingInfo}>
                <h3 style={{ marginBottom: '5px' }}>{user.name}</h3>
                <p style={{ color: 'var(--text2)' }}>{user.email}</p>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 8px', background: 'var(--surface)', borderRadius: '4px', fontSize: '12px' }}>
                    Plan: <strong>{user.subscriptionPlan}</strong>
                  </span>
                  <span style={{ padding: '4px 8px', background: 'var(--surface)', borderRadius: '4px', fontSize: '12px' }}>
                    Alan Limiti: <strong>{user.customWorkspaceLimit ?? 'Varsayılan'}</strong>
                  </span>
                </div>
              </div>
              <div className={styles.settingAction} style={{ justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => openUserEdit(user)}
                  className={styles.saveBtn}
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  Düzenle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card-bg, white)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>{selectedUser.name} - Sınırları Yönet</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Plan (Paket):</label>
              <select 
                className={styles.inputField}
                style={{ width: '100%' }}
                value={editForm.SubscriptionPlan} 
                onChange={(e) => setEditForm({...editForm, SubscriptionPlan: e.target.value})}
              >
                <option value="free">Free</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Özel Çalışma Alanı Limiti:</label>
              <input 
                type="number" 
                className={styles.inputField}
                style={{ width: '100%' }}
                placeholder="Örn: 5"
                value={editForm.CustomWorkspaceLimit} 
                onChange={(e) => setEditForm({...editForm, CustomWorkspaceLimit: e.target.value})}
              />
              <small style={{ color: 'var(--text-tertiary)' }}>Boş bırakılırsa plana ait global kota uygulanır.</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Özel AI Limiti:</label>
              <input 
                type="number" 
                className={styles.inputField}
                style={{ width: '100%' }}
                value={editForm.CustomAiLimit} 
                onChange={(e) => setEditForm({...editForm, CustomAiLimit: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => setSelectedUser(null)}
                className={styles.saveBtn}
                style={{ background: 'transparent', color: 'var(--text2)' }}
              >
                İptal
              </button>
              <button 
                onClick={handleSaveUser} 
                className={styles.saveBtn}
                style={{ background: '#10b981', color: 'white' }}
              >
                <Save size={18} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
