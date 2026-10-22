import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeachers, useDeactivateTeacher, usePrograms } from '../coachSchoolApi';
import { useSendInvite } from '../coachApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import Modal from '../../../components/common/Modal/Modal';
import { Trash2 } from 'lucide-react';
import styles from './CoachTeachersPage.module.css';

const CoachTeachersPage = () => {
  const { programId: routeProgramId } = useParams();
  const navigate = useNavigate();
  const { data: programs = [] } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  
  const programId = routeProgramId || selectedProgramId || (programs.length > 0 ? programs[0].id : null);
  const { data: teachers, isLoading } = useTeachers(programId);
  const deactivateTeacher = useDeactivateTeacher();
  const sendInvite = useSendInvite();

  const [email, setEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    const res = await sendInvite.mutateAsync({ email: email.trim(), role: 'Teacher', relatedId: programId, sendEmail });
    setInviteMsg(sendEmail ? `Davet oluşturuldu ve e-posta gönderildi. Kod: ${res.code}` : `Davet oluşturuldu. Kod: ${res.code}`);
    setEmail('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Öğretmenler</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleInvite} className={styles.form}>
          <Input label="Öğretmen E-postası" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ogretmen@ornek.com" type="email" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-color-main)' }}>
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> E-posta ile de gönder
          </label>
          <Button type="submit" isLoading={sendInvite.isPending}>Davet Gönder</Button>
          {inviteMsg && <p className={styles.msg}>{inviteMsg}</p>}
        </form>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {teachers?.map((t) => (
          <Card key={t.id} className={styles.item} padding="md" interactive onClick={() => navigate(`/coach/programs/${programId}/teachers/${t.id}`)}>
            <div className={styles.itemHeader}>
              <strong>{t.fullName}</strong>
              <span className={t.isActive ? styles.active : styles.inactive}>{t.isActive ? 'Aktif' : 'Pasif'}</span>
            </div>
            <div className={styles.email}>{t.email}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
              {t.isActive === 1 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    deactivateTeacher.mutateAsync({ programId, teacherId: t.id }); 
                  }}
                >
                  Pasife Al
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                style={{ color: 'var(--color-danger, #ef4444)', marginLeft: 'auto' }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setTeacherToDelete(t); 
                }}
                title="Öğretmeni Sil"
              >
                <Trash2 size={14} />
                <span>Sil</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Öğretmen Silme Onay Modalı */}
      <Modal
        isOpen={Boolean(teacherToDelete)}
        onClose={() => setTeacherToDelete(null)}
        title="Öğretmeni Sil"
        maxWidth="440px"
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-color-main)', marginBottom: '16px', lineHeight: 1.5 }}>
          <strong>{teacherToDelete?.fullName}</strong> adlı öğretmeni silmek istediğinize emin misiniz? Öğretmenin ders atamaları sonlandırılacak ve pasife alınacaktır.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setTeacherToDelete(null)}>
            Vazgeç
          </Button>
          <Button 
            variant="danger" 
            isLoading={deactivateTeacher.isPending}
            onClick={async () => {
              if (teacherToDelete) {
                await deactivateTeacher.mutateAsync({ programId, teacherId: teacherToDelete.id });
                setTeacherToDelete(null);
              }
            }}
          >
            Evet, Öğretmeni Sil
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CoachTeachersPage;
