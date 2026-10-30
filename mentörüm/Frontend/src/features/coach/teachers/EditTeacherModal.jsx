import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Input, { Select } from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import { TEACHER_BRANCH_OPTIONS } from '../../../constants/domainConstants';
import { useUpdateTeacher } from '../coachSchoolApi';
import { UserCheck, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './AddTeacherModal.module.css';

const BRANCH_OPTIONS = TEACHER_BRANCH_OPTIONS;

export default function EditTeacherModal({ open, isOpen, onClose, programId, teacher }) {
  const effectiveOpen = isOpen ?? open;
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState(BRANCH_OPTIONS[0]);
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const updateTeacher = useUpdateTeacher();

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.fullName || '');
      setBranch(teacher.branch || BRANCH_OPTIONS[0]);
      setPhone(teacher.phone || '');
      setIsActive(teacher.isActive === 1 || teacher.isActive === true);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [teacher, effectiveOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Öğretmen adı ve soyadı zorunludur.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateTeacher.mutateAsync({
        programId,
        teacherId: teacher.id,
        data: {
          fullName: fullName.trim(),
          branch: branch?.trim() || null,
          phone: phone?.trim() || null,
          isActive: isActive,
        },
      });

      setSuccessMsg('Öğretmen bilgileri başarıyla güncellendi.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Güncelleme sırasında bir hata oluştu.');
    }
  };

  if (!effectiveOpen || !teacher) return null;

  return (
    <Modal isOpen={effectiveOpen} onClose={onClose} title="Öğretmen Bilgilerini Düzenle" maxWidth="500px">
      <form onSubmit={handleSubmit} className={styles.form}>
        {errorMsg && (
          <div className={styles.errorBox}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className={styles.successBox}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <Input
          label="Ad Soyad *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Örn: Ayşe Yılmaz"
          required
        />

        <Select
          label={
            <>
              <BookOpen size={14} />
              <span>Branş / Uzmanlık Alanı</span>
            </>
          }
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          {BRANCH_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>

        <Input
          label="Telefon Numarası"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Örn: 0555 123 45 67"
        />

        <Select
          label={
            <>
              <UserCheck size={14} />
              <span>Durum</span>
            </>
          }
          value={isActive ? '1' : '0'}
          onChange={(e) => setIsActive(e.target.value === '1')}
        >
          <option value="1">Aktif Öğretmen</option>
          <option value="0">Pasif / Ayrılmış Öğretmen</option>
        </Select>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" variant="primary" isLoading={updateTeacher.isPending}>
            Değişiklikleri Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
