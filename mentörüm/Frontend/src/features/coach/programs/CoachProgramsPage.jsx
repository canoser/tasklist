import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms, useCreateProgram } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachProgramsPage.module.css';

const CoachProgramsPage = () => {
  const navigate = useNavigate();
  const { data: programs, isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const [name, setName] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createProgram.mutateAsync({ name: name.trim() });
    setName('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Programlarım</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <Input label="Yeni Program Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 12-A Koçluk" />
          <Button type="submit" isLoading={createProgram.isPending}>Program Oluştur</Button>
        </form>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {programs?.map((p) => (
          <Card key={p.id} className={styles.item} padding="md">
            <div className={styles.itemHeader}>
              <strong>{p.name}</strong>
              <span className={styles.badge}>{p.role === 'YONETICI' ? 'Yönetici' : 'Yardımcı'}</span>
            </div>
            <div className={styles.itemMeta}>Öğrenci: {p.studentCount}</div>
            <div className={styles.actions}>
              <Button size="sm" onClick={() => navigate(`/coach/programs/${p.id}/teachers`)}>Öğretmenler</Button>
              <Button size="sm" onClick={() => navigate(`/coach/programs/${p.id}/courses`)}>Dersler</Button>
              <Button size="sm" onClick={() => navigate(`/coach/programs/${p.id}/groups`)}>Gruplar</Button>
              <Button size="sm" onClick={() => navigate(`/coach/programs/${p.id}/schedule`)}>Program</Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${p.id}/settings`)}>Ayarlar</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachProgramsPage;
