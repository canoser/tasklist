import React, { useState } from 'react';
import { usePendingApprovals, useAdminUsers, useApproveUser, useRejectUser, useAddUser } from '../coach/coachSchoolApi';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Card from '../../components/common/Card/Card';
import styles from './AdminPanelPage.module.css';

const ROLE_LABEL = { 
  Student: 'Öğrenci', 
  Parent: 'Veli', 
  Coach: 'Koç',
  Teacher: 'Öğretmen',
  Admin: 'Yönetici'
};

const AdminPanelPage = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pending, isLoading: isPendingLoading } = usePendingApprovals();
  const { data: allUsers, isLoading: isAllUsersLoading } = useAdminUsers(roleFilter, searchTerm);
  
  const approve = useApproveUser();
  const reject = useRejectUser();
  const addUser = useAddUser();

  const [roles, setRoles] = useState({});
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Coach');
  const [created, setCreated] = useState(null);
  const [addError, setAddError] = useState('');

  const handleApprove = (userId, defaultRole) => {
    const role = roles[userId] || defaultRole;
    const maxPrograms = role === 'Coach' ? (prompt('Program limiti (boş = varsayılan):') || null) : null;
    approve.mutateAsync({ userId, role, maxPrograms: maxPrograms ? parseInt(maxPrograms, 10) : null });
  };

  const handleAddUser = async () => {
    setAddError('');
    setCreated(null);
    if (!newEmail || !newFullName) { setAddError('Ad Soyad ve e-posta zorunludur.'); return; }
    try {
      const res = await addUser.mutateAsync({ email: newEmail, fullName: newFullName, role: newRole });
      setCreated(res);
      setNewEmail(''); setNewFullName('');
    } catch (err) {
      setAddError(err?.response?.data?.error || 'Kullanıcı eklenemedi.');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Sistem Yönetim Paneli</h1>
          <p className={styles.subtitle}>Tüm kullanıcıları, bağımsız öğrencileri ve onay bekleyen başvuruları yönetin.</p>
        </div>
      </header>

      {/* Navigasyon Sekmeleri */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Onay Bekleyenler 
          {pending && pending.length > 0 && <span className={styles.tabBadge}>{pending.length}</span>}
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          👥 Tüm Kullanıcılar
          {allUsers && <span className={styles.tabBadgeNeutral}>{allUsers.length}</span>}
        </button>
      </div>

      {/* SEKME 1: ONAY BEKLEYENLER */}
      {activeTab === 'pending' && (
        <div className={styles.section}>
          <Card className={styles.addCard} padding="md">
            <h3 className={styles.cardSectionTitle}>Manuel Kullanıcı Ekle</h3>
            <div className={styles.formGrid}>
              <Input label="Ad Soyad" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
              <Input label="E-posta" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ornek@email.com" />
              <div>
                <label className={styles.selectLabel}>Rol Seçin</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={styles.select}>
                  <option value="Coach">Koç</option>
                  <option value="Student">Öğrenci</option>
                  <option value="Parent">Veli</option>
                </select>
              </div>
            </div>
            <Button size="sm" onClick={handleAddUser} style={{ marginTop: '12px' }}>Kullanıcıyı Kaydet</Button>
            {addError && <p className={styles.error}>{addError}</p>}
            {created && (
              <div className={styles.createdInfo}>
                <p>✅ Kullanıcı eklendi. Geçici şifre: <strong>{created.password}</strong></p>
                <p>E-posta: {created.email} (Bu şifreyi kullanıcıya iletin)</p>
              </div>
            )}
          </Card>

          <div className={styles.list}>
            <h3 className={styles.listTitle}>Onay Bekleyen Kayıtlar</h3>
            {isPendingLoading && <p>Yükleniyor...</p>}
            {!isPendingLoading && pending?.length === 0 && (
              <div className={styles.emptyState}>
                <span>✓</span>
                <p>Şu anda onay bekleyen kullanıcı bulunmuyor.</p>
              </div>
            )}
            {pending?.map((u) => (
              <Card key={u.id} className={styles.item} padding="md">
                <div className={styles.itemHeader}>
                  <div>
                    <strong className={styles.userName}>{u.fullName}</strong>
                    <div className={styles.email}>{u.email}</div>
                  </div>
                  <span className={styles.badgePending}>Onay Bekliyor</span>
                </div>
                <div className={styles.roleRow}>
                  <span className={styles.roleSelectLabel}>Onaylanacak Rol:</span>
                  {['Student', 'Parent', 'Coach'].map((r) => (
                    <label key={r} className={styles.roleRadio}>
                      <input
                        type="radio"
                        name={`role-${u.id}`}
                        value={r}
                        checked={(roles[u.id] || u.role) === r}
                        onChange={() => setRoles({ ...roles, [u.id]: r })}
                      />
                      {ROLE_LABEL[r]}
                    </label>
                  ))}
                </div>
                <div className={styles.actions}>
                  <Button size="sm" onClick={() => handleApprove(u.id, u.role)} isLoading={approve.isPending}>
                    ✓ Onayla
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject.mutateAsync({ userId: u.id })} isLoading={reject.isPending}>
                    ✕ Reddet
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SEKME 2: TÜM SİSTEM KULLANICILARI */}
      {activeTab === 'all' && (
        <div className={styles.section}>
          <Card className={styles.filterCard} padding="md">
            <div className={styles.allFilterGrid}>
              <Input 
                placeholder="İsim veya e-posta ile kullanıcı ara..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)} 
                className={styles.select}
              >
                <option value="">Tüm Roller</option>
                <option value="Student">Öğrenci</option>
                <option value="Coach">Koç</option>
                <option value="Parent">Veli</option>
                <option value="Teacher">Öğretmen</option>
                <option value="Admin">Yönetici</option>
              </select>
            </div>
          </Card>

          <div className={styles.list}>
            {isAllUsersLoading && <p>Kullanıcılar yükleniyor...</p>}
            {!isAllUsersLoading && allUsers?.length === 0 && (
              <div className={styles.emptyState}>
                <p>Arama kriterine uygun kullanıcı bulunamadı.</p>
              </div>
            )}
            {allUsers?.map((u) => (
              <Card key={u.id} className={styles.allUserCard} padding="md">
                <div className={styles.userMainInfo}>
                  <div className={styles.avatarCircle}>
                    {u.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className={styles.allUserNameRow}>
                      <strong className={styles.allUserName}>{u.fullName}</strong>
                      <span className={`${styles.roleBadge} ${styles['role_' + u.role]}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                      <span className={u.approvalStatus === 'APPROVED' ? styles.statusApproved : styles.statusPending}>
                        {u.approvalStatus === 'APPROVED' ? 'Aktif' : u.approvalStatus}
                      </span>
                    </div>
                    <div className={styles.allUserEmail}>{u.email}</div>
                    <div className={styles.programInfo}>
                      {u.role === 'Student' && (
                        <span>
                          🏫 Program: <strong>{u.programName || 'Bireysel / Bağımsız'}</strong>
                        </span>
                      )}
                      <span className={styles.createdDate}>
                        Kayıt: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelPage;
