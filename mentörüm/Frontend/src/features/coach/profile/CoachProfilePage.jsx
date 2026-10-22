import React, { useState, useEffect } from 'react';
import { useMe, usePrograms } from '../coachSchoolApi';
import { useUpdateCoachProfile } from '../coachApi';
import { apiClient } from '../../../api/apiClient';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import styles from './CoachProfilePage.module.css';

const CoachProfilePage = () => {
  const { data: me, isLoading } = useMe();
  const { data: programs } = usePrograms();
  const updateProfile = useUpdateCoachProfile();

  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
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

  useEffect(() => {
    if (me) {
      setBio(me.bio || '');
      setSpecialty(me.specialty || '');
    }
  }, [me]);

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>

      <Card className={styles.profileHeaderCard} padding="lg">
        <div className={styles.headerAvatarWrapper}>
          <div className={styles.avatar}>{me?.fullName?.charAt(0) || 'K'}</div>
          <div className={styles.headerInfo}>
            <h2 className={styles.name}>{me?.fullName || 'Koç'}</h2>
            <p className={styles.metaEmail}>{me?.email}</p>
            <span className={styles.roleBadge}>{me?.role === 'Admin' ? 'Yönetici' : 'Koç'}</span>
          </div>
        </div>
      </Card>

      <Card className={styles.formCard} padding="lg">
        <h3 className={styles.sectionTitle}>Hakkımda</h3>
        <div className={styles.formGroup}>
          <Input
            label="Uzmanlık Alanı"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="örn. YKS Sayısal, LGS"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Biyografi</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Kendiniz ve koçluk yaklaşımınız hakkında kısa bir açıklama..."
            className={styles.textarea}
          />
        </div>
        <div className={styles.formActions}>
          <Button
            variant="primary"
            size="md"
            onClick={() => updateProfile.mutate({ bio, specialty })}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
          {updateProfile.isSuccess && (
            <span className={styles.successMessage}>✓ Profil güncellendi</span>
          )}
        </div>
      </Card>

      <Card className={styles.formCard} padding="lg">
        <h3 className={styles.sectionTitle}>Şifre Oluştur / Değiştir</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-color-muted)', marginBottom: '12px' }}>
          Google ile giriş yapmış olsanız bile bir şifre belirleyebilir, dilediğinizde e-posta + şifre ile girebilirsiniz.
        </p>
        <Input
          label="Yeni Şifre"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="En az 6 karakter"
        />
        <div className={styles.formActions}>
          <Button variant="primary" size="md" onClick={handleSetPassword} disabled={pwSaving}>
            {pwSaving ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
          </Button>
          {pwMsg && <span className={styles.successMessage}>✓ {pwMsg}</span>}
          {pwError && <span style={{ color: 'var(--color-danger)' }}>{pwError}</span>}
        </div>
      </Card>

      <Card className={styles.formCard} padding="lg">
        <h3 className={styles.sectionTitle}>Programlarım ({programs?.length || 0})</h3>
        <div className={styles.programList}>
          {programs?.length > 0 ? (
            programs.map((p) => (
              <div key={p.id} className={styles.programItem}>
                <div>
                  <strong className={styles.programName}>{p.name}</strong>
                  <div className={styles.programMeta}>
                    <span>{p.role === 'YONETICI' ? 'Yönetici' : 'Yardımcı'}</span>
                    <span> · </span>
                    <span>{p.studentCount || 0} öğrenci</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.emptyMeta}>Henüz program oluşturmadınız.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CoachProfilePage;
