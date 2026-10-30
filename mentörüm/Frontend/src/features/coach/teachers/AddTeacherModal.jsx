import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import { TEACHER_BRANCH_OPTIONS } from '../../../constants/domainConstants';
import { useDirectCreateTeacher } from '../coachSchoolApi';
import { useSendInvite } from '../coachApi';
import { Zap, Mail } from 'lucide-react';
import styles from './AddTeacherModal.module.css';

const BRANCH_OPTIONS = TEACHER_BRANCH_OPTIONS;

export default function AddTeacherModal({ open, onClose, programId, courses = [] }) {
  const [mode, setMode] = useState('DIRECT'); // 'DIRECT' | 'INVITE'

  // Doğrudan ekleme state'leri
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [branch, setBranch] = useState(BRANCH_OPTIONS[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // Davet state'leri
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const directCreateTeacher = useDirectCreateTeacher();
  const sendInvite = useSendInvite();

  const handleToggleCourse = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await directCreateTeacher.mutateAsync({
        programId,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          branch: branch || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          password: password.trim() || '123456',
          courseIds: selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
        },
      });

      setSuccessMsg('Öğretmen başarıyla eklendi.');
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Öğretmen eklenemedi.');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await sendInvite.mutateAsync({
        email: inviteEmail.trim(),
        role: 'Teacher',
        relatedId: programId,
        sendEmail,
      });

      setSuccessMsg(
        sendEmail
          ? `Davet oluşturuldu ve e-posta gönderildi. Kod: ${res.code}`
          : `Davet kodu oluşturuldu: ${res.code}`
      );
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Davet oluşturulamadı.');
    }
  };

  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setBranch(BRANCH_OPTIONS[0]);
    setPhone('');
    setEmail('');
    setPassword('123456');
    setSelectedCourseIds([]);
    setInviteEmail('');
    setSendEmail(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Öğretmen Ekle" maxWidth="500px">
      <div style={{ marginBottom: 14 }}>
        <SegmentedTabs
          fullWidth
          activeTab={mode}
          onChange={(id) => {
            setMode(id);
            setErrorMsg('');
            setSuccessMsg('');
          }}
          tabs={[
            { id: 'DIRECT', label: '⚡ Doğrudan Ekle', icon: <Zap size={15} /> },
            { id: 'INVITE', label: '✉️ E-posta ile Davet', icon: <Mail size={15} /> },
          ]}
        />
      </div>

      {mode === 'DIRECT' ? (
        <form onSubmit={handleDirectSubmit} className={styles.form}>
          <div className={styles.nameRow}>
            <Input
              label="Ad *"
              placeholder="Örn: Mehmet"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Soyad *"
              placeholder="Örn: Kaya"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className={styles.nameRow}>
            <div className={styles.fieldWrapper}>
              <label className={styles.label}>Branş *</label>
              <select
                className={styles.select}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <Input
              label="Telefon (İsteğe Bağlı)"
              placeholder="05xx xxx xx xx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          </div>

          <Input
            label="E-posta (İsteğe Bağlı / Giriş İçin)"
            placeholder="ogretmen@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />

          <Input
            label="Giriş Şifresi"
            placeholder="Varsayılan: 123456"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {courses && courses.length > 0 && (
            <div className={styles.fieldWrapper}>
              <label className={styles.label}>Gireceği Dersler (İsteğe Bağlı)</label>
              <div className={styles.courseList}>
                {courses.map((c) => {
                  const isChecked = selectedCourseIds.includes(c.id);
                  return (
                    <label key={c.id} className={styles.courseItem}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCourse(c.id)}
                      />
                      <span>{c.name}</span>
                      {c.type && <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>({c.type})</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <p className={styles.hint}>
            Öğretmen doğrudan çalışma alanınıza eklenir, sisteme tanımlanan şifreyle hemen giriş yapabilir.
          </p>

          {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}
          {successMsg && <div className={styles.successMessage}>{successMsg}</div>}

          <div className={styles.actions}>
            <Button variant="ghost" type="button" onClick={handleClose}>
              İptal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={directCreateTeacher.isPending}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Öğretmeni Ekle
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleInviteSubmit} className={styles.form}>
          <Input
            label="Öğretmen E-postası *"
            placeholder="ogretmen@ornek.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
            required
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span>E-posta ile de gönder</span>
          </label>

          <p className={styles.hint}>
            Öğretmene katılım kodu ve bağlantısı oluşturulur.
          </p>

          {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}
          {successMsg && <div className={styles.successMessage}>{successMsg}</div>}

          <div className={styles.actions}>
            <Button variant="ghost" type="button" onClick={handleClose}>
              İptal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={sendInvite.isPending}
              disabled={!inviteEmail.trim()}
            >
              Davet Gönder
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
