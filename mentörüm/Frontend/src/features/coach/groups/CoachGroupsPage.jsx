import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useGroups,
  useCreateGroup,
  useGroupMembers,
  useAddGroupMember,
  useRemoveGroupMember
} from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import AddStudentsToCourseModal from '../courses/AddStudentsToCourseModal';
import styles from './CoachGroupsPage.module.css';

const GroupItem = ({ group, programId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(
    programId,
    isExpanded ? group.id : null
  );
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const handleAddStudents = async (studentIds) => {
    for (const studentId of studentIds) {
      await addMember.mutateAsync({ programId, groupId: group.id, studentId });
    }
  };

  const handleRemoveMember = async (studentId) => {
    if (window.confirm('Öğrenciyi bu gruptan çıkarmak istediğinize emin misiniz?')) {
      await removeMember.mutateAsync({ programId, groupId: group.id, studentId });
    }
  };

  return (
    <Card className={styles.item} padding="md">
      <div className={styles.itemHeader}>
        <div>
          <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{group.name}</strong>
          <span className={styles.meta} style={{ marginLeft: '0.75rem' }}>
            Üye: <strong>{group.memberCount}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(prev => !prev)}
          >
            {isExpanded ? 'Kapat' : 'Üyeleri Yönet'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Grup Üyeleri ({members.length})
            </h4>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              + Öğrenci Ekle
            </Button>
          </div>

          {membersLoading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Üyeler yükleniyor...</p>
          ) : members.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
              Bu grupta henüz öğrenci yok. Öğrenci eklemek için butona tıklayın.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.fullName}</strong>
                    {m.grade && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                        ({m.grade}. Sınıf)
                      </span>
                    )}
                    {m.email && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {m.email}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveMember(m.id)}
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                  >
                    Çıkar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <AddStudentsToCourseModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            existingStudents={members}
            onAddStudents={handleAddStudents}
            title={`${group.name} Grubuna Öğrenci Ekle`}
          />
        </div>
      )}
    </Card>
  );
};

const CoachGroupsPage = ({ programId: propProgramId }) => {
  const { programId: routeProgramId } = useParams();
  const programId = propProgramId || routeProgramId;
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
      <h1 className={styles.title}>Grup Programları</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <Input label="Grup Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 12-A" />
          <Button type="submit" isLoading={createGroup.isPending}>Grup Oluştur</Button>
        </form>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {groups?.map((g) => (
          <GroupItem key={g.id} group={g} programId={programId} />
        ))}
      </div>
    </div>
  );
};

export default CoachGroupsPage;

