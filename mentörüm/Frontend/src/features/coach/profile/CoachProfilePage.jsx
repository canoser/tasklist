import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Settings } from 'lucide-react';
import { useMe } from '../coachSchoolApi';
import { useUpdateCoachProfile } from '../coachApi';
import { apiClient } from '../../../api/apiClient';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import CoachProgramSettingsPage from '../settings/CoachProgramSettingsPage';
import styles from './CoachProfilePage.module.css';

const CoachProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'program' ? 'program' : 'profile');
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateCoachProfile();

  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'program' || t === 'profile') {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'program' ? { tab: 'program' } : {}, { replace: true });
  };

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
      <div className={styles.headerBlock}>
        <h1 className={styles.title}>Ayarlar & Profil</h1>
        <p className={styles.subtitle}>Kişisel koçluk profilinizi, hesap güvenliğinizi ve program yöneticilerinizi yönetin.</p>
      </div>

      <div className={styles.segmentedTabs}>
        <button
          type="button"
          className={`${styles.segmentedBtn} ${activeTab === 'profile' ? styles.segmentedBtnActive : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <User size={16} />
          <span>Profil & Hesap Güvenliği</span>
        </button>
        <button
          type="button"
          className={`${styles.segmentedBtn} ${activeTab === 'program' ? styles.segmentedBtnActive : ''}`}
          onClick={() => handleTabChange('program')}
        >
          <Settings size={16} />
          <span>Program & Yardımcı Koçlar</span>
        </button>
      </div>

      {activeTab === 'program' ? (
        <CoachProgramSettingsPage embedded={true} />
      ) : (
        <>
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
            <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate({ bio, specialty }); }}>
              <div className={styles.formGroup}>
                <Input
                  label="Uzmanlık Alanı"
                  id="coach-specialty"
                  name="coach-specialty"
                  autoComplete="off"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="örn. YKS Sayısal, LGS"
                />
              </div>
              <div className={styles.formGroup} style={{ marginTop: 12 }}>
                <label className={styles.formLabel}>Biyografi</label>
                <textarea
                  id="coach-bio"
                  name="coach-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Kendiniz ve koçluk yaklaşımınız hakkında kısa bir açıklama..."
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formActions} style={{ marginTop: 12 }}>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
                {updateProfile.isSuccess && (
                  <span className={styles.successMessage}>✓ Profil güncellendi</span>
                )}
              </div>
            </form>
          </Card>

          <Card className={styles.formCard} padding="lg">
            <h3 className={styles.sectionTitle}>Şifre Oluştur / Değiştir</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-color-muted)', marginBottom: '12px' }}>
              Google ile giriş yapmış olsanız bile bir şifre belirleyebilir, dilediğinizde e-posta + şifre ile girebilirsiniz.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleSetPassword(); }}>
              <Input
                label="Yeni Şifre"
                type="password"
                id="coach-new-password"
                name="new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
              />
              <div className={styles.formActions} style={{ marginTop: '12px' }}>
                <Button variant="primary" size="md" type="submit" disabled={pwSaving}>
                  {pwSaving ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
                </Button>
                {pwMsg && <span className={styles.successMessage}>✓ {pwMsg}</span>}
                {pwError && <span style={{ color: 'var(--color-danger)' }}>{pwError}</span>}
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
};

export default CoachProfilePage;
