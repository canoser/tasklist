import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGroups, useCreateGroup } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachGroupsPage.module.css';

const CoachGroupsPage = () => {
  const { programId } = useParams();
  const { data: groups, isLoading } = useGroups(programId);
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createGroup.mutateAsync({ programId, data: { name: name.trim() } });
    setName('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gruplar</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <Input label="Grup Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 12-A" />
          <Button type="submit" isLoading={createGroup.isPending}>Grup Oluştur</Button>
        </form>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {groups?.map((g) => (
          <Card key={g.id} className={styles.item} padding="md">
            <div className={styles.itemHeader}>
              <strong>{g.name}</strong>
              <span className={styles.meta}>Üye: {g.memberCount}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachGroupsPage;
