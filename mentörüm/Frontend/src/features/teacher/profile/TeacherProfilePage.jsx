import React, { useState } from 'react';
import { useTeacherProfile } from '../teacherApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { apiClient } from '../../../api/apiClient';
import styles from './TeacherProfilePage.module.css';

const TeacherProfilePage = () => {
  const { data: profile, isLoading } = useTeacherProfile();
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setPwError('Şifre en az 6 karakter olmalı.'); return; }
    setPwError(''); setPwMsg(''); setPwSaving(true);
    try {
      const res = await apiClient.post('/me/password', { newPassword });
      setPwMsg(res.message || 'Şifreniz oluşturuldu.');
      setNewPassword('');
    } catch (err) {
      setPwError(err?.response?.data?.error || 'Şifre oluşturulamadı.');
    } finally {
      setPwSaving(false);
    }
  };

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>

      <Card className={styles.card} padding="lg">
        <div className={styles.avatar}>{profile?.fullName?.charAt(0) || 'T'}</div>
        <h2 className={styles.name}>{profile?.fullName || 'Öğretmen'}</h2>
        <p className={styles.meta}>{profile?.email}</p>
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Bağlı Programlar</h3>
        {profile?.programs?.length > 0 ? (
          profile.programs.map((p, i) => <div key={i} className={styles.item}>{p}</div>)
        ) : (
          <p className={styles.meta}>Henüz program atanmadı.</p>
        )}
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Derslerim ({profile?.courses?.length || 0})</h3>
        {profile?.courses?.length > 0 ? (
          profile.courses.map((c) => (
            <div key={c.id} className={styles.item}>
              <strong>{c.name}</strong>
              {c.type && <span className={styles.meta}> · {c.type}</span>}
            </div>
          ))
        ) : (
          <p className={styles.meta}>Henüz ders atanmadı.</p>
        )}
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Şifre Oluştur / Değiştir</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-color-muted)', marginBottom: '12px' }}>
          Google ile giriş yapmış olsanız bile bir şifre belirleyebilir, dilediğinizde e-posta + şifre ile girebilirsiniz.
        </p>
        <Input label="Yeni Şifre" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="En az 6 karakter" />
        <Button variant="primary" size="md" onClick={handleSetPassword} disabled={pwSaving}>
          {pwSaving ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
        </Button>
        {pwMsg && <span className={styles.msg}>{pwMsg}</span>}
        {pwError && <span style={{ color: 'var(--color-danger)' }}>{pwError}</span>}
      </Card>
    </div>
  );
};

export default TeacherProfilePage;
