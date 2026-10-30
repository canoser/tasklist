import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms, useCreateProgram } from '../coachSchoolApi';
import { useStudents } from '../coachApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import Modal from '../../../components/common/Modal/Modal';
import { Plus, Users } from 'lucide-react';
import styles from './CoachProgramsPage.module.css';

const CoachProgramsPage = () => {
  const navigate = useNavigate();
  const { data: programs, isLoading } = usePrograms();
  const { data: students } = useStudents();
  const createProgram = useCreateProgram();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  const studentsByProgram = useMemo(() => {
    const map = {};
    (students || []).forEach((s) => {
      if (s.programId) {
        (map[s.programId] || (map[s.programId] = [])).push(s);
      }
    });
    return map;
  }, [students]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createProgram.mutateAsync({ name: name.trim(), category: category || null });
    setName('');
    setCategory('');
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Programlarım</h1>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Yeni Program</span>
        </Button>
      </div>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {programs?.length === 0 && (
          <Card className={styles.emptyCard} padding="lg">
            <p>Henüz bir program oluşturmadınız. Yukarıdaki butona tıklayarak ilk programınızı oluşturabilirsiniz.</p>
          </Card>
        )}
        {programs?.map((p) => {
          const progStudents = studentsByProgram[p.id] || [];
          return (
            <Card key={p.id} className={styles.item} padding="md">
              <div className={styles.itemHeader}>
                <div>
                  <h3 className={styles.itemTitle}>{p.name}</h3>
                  {p.category && <span className={styles.badge}>{p.category}</span>}
                </div>
                <span className={styles.studentCount}>
                  <Users size={14} />
                  <span>{progStudents.length} Öğrenci</span>
                </span>
              </div>

              {progStudents.length > 0 && (
                <div className={styles.studentChips}>
                  <div className={styles.chipsLabel}>Öğrenciler:</div>
                  <div className={styles.chipsList}>
                    {progStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={styles.studentButton}
                        onClick={() => navigate(`/coach/students/${s.id}`)}
                      >
                        {s.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.actions}>
                <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${p.id}/teachers`)}>Öğretmenler</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${p.id}/courses`)}>Dersler</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${p.id}/groups`)}>Gruplar</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${p.id}/schedule`)}>Program</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${p.id}/audit-logs`)}>Denetim İzi</Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/coach/programs/${p.id}/settings`)}>Ayarlar</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Program Oluştur">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <Input 
            label="Yeni Program Adı" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Örn: 12-A Koçluk" 
            required 
          />
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-color-main)' }}>
              Kategori Seç (opsiyonel)
            </label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color-surface)', color: 'var(--text-color-main)' }}
            >
              <option value="">Kategori Seçin...</option>
              <option value="YKS">YKS</option>
              <option value="LGS">LGS</option>
              <option value="Ara Sınıf">Ara Sınıf</option>
              <option value="Okul Dersi">Okul Dersi</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button type="submit" variant="primary" isLoading={createProgram.isPending}>Program Oluştur</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CoachProgramsPage;
