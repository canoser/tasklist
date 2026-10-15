import React, { useState, useEffect } from 'react';
import { useMe, usePrograms } from '../coachSchoolApi';
import { useUpdateCoachProfile } from '../coachApi';
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

      <Card className={styles.card} padding="lg">
        <div className={styles.avatar}>{me?.fullName?.charAt(0) || 'K'}</div>
        <h2 className={styles.name}>{me?.fullName || 'Koç'}</h2>
        <p className={styles.meta}>{me?.email}</p>
        <p className={styles.meta}>Rol: {me?.role === 'Admin' ? 'Yönetici' : 'Koç'}</p>
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Hakkımda</h3>
        <Input
          label="Uzmanlık Alanı"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="örn. YKS Sayısal, LGS"
        />
        <div style={{ marginTop: 12 }}>
          <label className={styles.meta} style={{ display: 'block', marginBottom: 6 }}>Biyografi</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Kendiniz ve koçluk yaklaşımınız hakkında kısa bir açıklama..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" size="sm" onClick={() => updateProfile.mutate({ bio, specialty })} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          {updateProfile.isSuccess && <span style={{ marginLeft: 10, color: '#16a34a' }}>✓ Kaydedildi</span>}
        </div>
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Programlarım ({programs?.length || 0})</h3>
        {programs?.length > 0 ? (
          programs.map((p) => (
            <div key={p.id} className={styles.item}>
              <strong>{p.name}</strong>
              <span className={styles.meta}> · {p.role === 'YONETICI' ? 'Yönetici' : 'Yardımcı'}</span>
              <span className={styles.meta}> · {p.studentCount || 0} öğrenci</span>
            </div>
          ))
        ) : (
          <p className={styles.meta}>Henüz program oluşturmadınız.</p>
        )}
      </Card>
    </div>
  );
};

export default CoachProfilePage;
