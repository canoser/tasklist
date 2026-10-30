import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Settings } from 'lucide-react';
import { useMe } from '../coachSchoolApi';
import { useUpdateCoachProfile } from '../coachApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import ChangePasswordCard from '../../../components/common/ChangePasswordCard/ChangePasswordCard';
import CoachProgramSettingsPage from '../settings/CoachProgramSettingsPage';
import styles from './CoachProfilePage.module.css';

const CoachProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'program' ? 'program' : 'profile');
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateCoachProfile();

  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');

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

      <SegmentedTabs
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={[
          { id: 'profile', label: 'Profil & Hesap Güvenliği', icon: <User size={16} /> },
          { id: 'program', label: 'Program & Yardımcı Koçlar', icon: <Settings size={16} /> },
        ]}
      />

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

          <ChangePasswordCard className={styles.formCard} idPrefix="coach" />
        </>
      )}
    </div>
  );
};

export default CoachProfilePage;
