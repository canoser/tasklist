import React, { useState } from 'react';
import { usePendingApprovals, useApproveUser, useRejectUser, useAddUser } from '../coach/coachSchoolApi';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Card from '../../components/common/Card/Card';
import styles from './AdminPanelPage.module.css';

const ROLE_LABEL = { Student: 'Öğrenci', Parent: 'Veli', Coach: 'Koç' };

const AdminPanelPage = () => {
  const { data: pending, isLoading } = usePendingApprovals();
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
      <h1 className={styles.title}>Yönetim — Onaylar</h1>

      <Card className={styles.addCard} padding="md">
        <h3 className={styles.subtitle}>Kullanıcı Ekle</h3>
        <Input label="Ad Soyad" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
        <Input label="E-posta" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ornek@email.com" />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={styles.select}>
          <option value="Coach">Koç</option>
          <option value="Student">Öğrenci</option>
          <option value="Parent">Veli</option>
        </select>
        <Button size="sm" onClick={handleAddUser}>Ekle</Button>
        {addError && <p className={styles.error}>{addError}</p>}
        {created && (
          <div className={styles.createdInfo}>
            <p>Kullanıcı eklendi. Geçici şifre: <strong>{created.password}</strong></p>
            <p>E-posta: {created.email} (şifreyi kullanıcıya iletin)</p>
          </div>
        )}
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {pending?.length === 0 && <p>Bekleyen kullanıcı yok.</p>}
        {pending?.map((u) => (
          <Card key={u.id} className={styles.item} padding="md">
            <strong>{u.fullName}</strong>
            <span className={styles.email}>{u.email}</span>
            <div className={styles.roleRow}>
              <span>Rol:</span>
              {['Student', 'Parent', 'Coach'].map((r) => (
                <label key={r}>
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
              <Button size="sm" onClick={() => handleApprove(u.id, u.role)} isLoading={approve.isPending}>Onayla</Button>
              <Button size="sm" variant="outline" onClick={() => reject.mutateAsync({ userId: u.id })} isLoading={reject.isPending}>Reddet</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminPanelPage;
