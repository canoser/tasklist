import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTeachers, useDeactivateTeacher, usePrograms, useCourses } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import Modal from '../../../components/common/Modal/Modal';
import AddTeacherModal from './AddTeacherModal';
import { Trash2, Plus, Mail, Phone, BookOpen, Users, GraduationCap } from 'lucide-react';
import styles from './CoachTeachersPage.module.css';

const CoachTeachersPage = () => {
  const { programId: routeProgramId } = useParams();
  const { data: programs = [] } = usePrograms();
  const [selectedProgramId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  const programId = routeProgramId || selectedProgramId || (programs.length > 0 ? programs[0].id : null);
  const { data: teachers = [], isLoading } = useTeachers(programId);
  const { data: courses = [] } = useCourses(programId);
  const deactivateTeacher = useDeactivateTeacher();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Öğretmenler</h1>
          <p className={styles.subtitle}>
            Programınızda ders veren öğretmenler, branşları ve ders atamaları.
          </p>
        </div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>+ Yeni Öğretmen Ekle</span>
        </button>
      </header>

      {isLoading ? (
        <div className={styles.loading}>Öğretmen listesi yükleniyor...</div>
      ) : teachers.length === 0 ? (
        <Card className={styles.emptyCard} padding="lg">
          <GraduationCap size={44} strokeWidth={1.5} color="var(--text-color-muted)" />
          <div>
            <h3 style={{ margin: '0 0 6px', color: 'var(--text-color-main)' }}>Henüz Öğretmen Eklenmedi</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Derslerinize öğretmen atamak için yeni bir öğretmen ekleyebilir veya e-posta daveti gönderebilirsiniz.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            + İlk Öğretmeni Ekle
          </Button>
        </Card>
      ) : (
        <div className={styles.teachersGrid}>
          {teachers.map((t) => (
            <Card key={t.id} className={styles.teacherCard} padding="md">
              <div className={styles.cardTop}>
                <div className={styles.avatar}>
                  {t.fullName?.charAt(0)?.toUpperCase() || 'Ö'}
                </div>
                <div className={styles.metaInfo}>
                  <div className={styles.nameRow}>
                    <h3 className={styles.name}>{t.fullName}</h3>
                    {t.branch && (
                      <span className={styles.branchBadge}>{t.branch}</span>
                    )}
                    <span className={t.isActive ? styles.statusActive : styles.statusInactive}>
                      {t.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>

              {/* İletişim Bilgileri (Mail & Telefon) */}
              <div className={styles.contactGrid}>
                <div className={styles.contactItem}>
                  <Mail size={14} />
                  <span>{t.email || 'E-posta belirtilmemiş'}</span>
                </div>
                <div className={styles.contactItem}>
                  <Phone size={14} />
                  <span>{t.phone || 'Telefon belirtilmemiş'}</span>
                </div>
              </div>

              {/* Girdiği Dersler */}
              <div className={styles.coursesSection}>
                <span className={styles.coursesLabel}>
                  <BookOpen size={13} />
                  <span>Girdiği Dersler ({t.courses?.length || 0})</span>
                </span>
                {t.courses && t.courses.length > 0 ? (
                  <div className={styles.courseBadges}>
                    {t.courses.map((c) => (
                      <span key={c.id} className={styles.courseBadge}>
                        <strong>{c.name}</strong>
                        {c.type && <span className={styles.courseBadgeType}>({c.type})</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.noCourses}>Henüz ders atanmamış</span>
                )}
              </div>

              {/* Alt Bilgi & Aksiyonlar */}
              <div className={styles.cardFooter}>
                <span className={styles.studentCount}>
                  <Users size={14} />
                  <span>{t.studentCount ?? 0} Aktif Öğrenci</span>
                </span>

                <div className={styles.actions}>
                  {t.isActive === 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deactivateTeacher.mutateAsync({ programId, teacherId: t.id })}
                      isLoading={deactivateTeacher.isPending}
                    >
                      Pasife Al
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    style={{ color: 'var(--color-danger, #ef4444)' }}
                    onClick={() => setTeacherToDelete(t)}
                    title="Öğretmeni Sil"
                  >
                    <Trash2 size={15} />
                    <span>Sil</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Doğrudan Ekleme & Davet Modalı */}
      <AddTeacherModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        programId={programId}
        courses={courses}
      />

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
