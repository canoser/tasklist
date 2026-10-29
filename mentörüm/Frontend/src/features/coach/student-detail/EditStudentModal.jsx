import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import styles from './EditStudentModal.module.css';

export default function EditStudentModal({ open, onClose, student, onSubmit }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [classLevel, setClassLevel] = useState('');
    const [targetExam, setTargetExam] = useState('');
    const [phone, setPhone] = useState('');
    const [targetUniversity, setTargetUniversity] = useState('');
    const [targetDepartment, setTargetDepartment] = useState('');
    const [monthlyMilestone, setMonthlyMilestone] = useState('');
    const [weeklyTargetMinutes, setWeeklyTargetMinutes] = useState('');
    const [weeklyTargetQuestions, setWeeklyTargetQuestions] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        if (student && open) {
            const parts = (student.fullName || '').trim().split(' ');
            const fn = parts[0] || '';
            const ln = parts.slice(1).join(' ') || '';
            setFirstName(fn);
            setLastName(ln);
            setClassLevel(student.grade ? String(student.grade) : '');
            setTargetExam(student.track || '');
            setPhone(student.phone || '');
            setTargetUniversity(student.targetUniversity || '');
            setTargetDepartment(student.targetDepartment || '');
            setMonthlyMilestone(student.monthlyMilestone || '');
            setWeeklyTargetMinutes(student.weeklyTargetMinutes != null ? String(student.weeklyTargetMinutes) : '');
            setWeeklyTargetQuestions(student.weeklyTargetQuestions != null ? String(student.weeklyTargetQuestions) : '');
            setSubmitError('');
        }
    }, [student, open]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) return;
        setSubmitError('');
        setSubmitting(true);
        try {
            await onSubmit({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                classLevel: classLevel ? parseInt(classLevel, 10) : undefined,
                targetExam: targetExam || undefined,
                phone: phone.trim() || undefined,
                targetUniversity: targetUniversity.trim() || undefined,
                targetDepartment: targetDepartment.trim() || undefined,
                monthlyMilestone: monthlyMilestone.trim() || undefined,
                weeklyTargetMinutes: weeklyTargetMinutes ? parseInt(weeklyTargetMinutes, 10) : undefined,
                weeklyTargetQuestions: weeklyTargetQuestions ? parseInt(weeklyTargetQuestions, 10) : undefined,
            });
            onClose();
        } catch (err) {
            setSubmitError(err?.response?.data?.error || err?.message || 'Öğrenci güncellenemedi.');
        } finally {
            setSubmitting(false);
        }
    }

    const handleClose = () => {
        setSubmitError('');
        onClose();
    };

    return (
        <Modal isOpen={open} onClose={handleClose} title="Öğrenci Bilgilerini Düzenle" maxWidth="460px">
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.nameRow}>
                    <Input 
                        label="Ad *"
                        placeholder="Örn: Ahmet" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        required 
                    />
                    <Input 
                        label="Soyad *"
                        placeholder="Örn: Yılmaz" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        required 
                    />
                </div>

                <div className={styles.levelRow}>
                    <Input 
                        label="Sınıf Seviyesi"
                        placeholder="Örn: 11" 
                        value={classLevel} 
                        onChange={(e) => setClassLevel(e.target.value)} 
                        type="number" 
                        min="1"
                        max="12"
                    />
                    <div className={styles.selectWrapper}>
                        <label className={styles.label}>Hedef Sınav</label>
                        <select 
                            className={styles.select} 
                            value={targetExam} 
                            onChange={(e) => setTargetExam(e.target.value)}
                        >
                            <option value="">Seçiniz (opsiyonel)</option>
                            <option value="SAY">SAY (Sayısal)</option>
                            <option value="EA">EA (Eşit Ağırlık)</option>
                            <option value="SOZ">SÖZ (Sözel)</option>
                            <option value="ORTAOKUL">LGS / Ortaokul</option>
                        </select>
                    </div>
                </div>

                <div className={styles.levelRow}>
                    <Input 
                        label="Telefon Numarası"
                        placeholder="Örn: 0555 123 4567" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                    />
                    <Input 
                        label="Aylık Dönüm Noktası (Milestone)"
                        placeholder="Örn: Limit-Türev bitirilecek" 
                        value={monthlyMilestone} 
                        onChange={(e) => setMonthlyMilestone(e.target.value)} 
                    />
                </div>

                <div className={styles.levelRow}>
                    <Input 
                        label="Hedef Üniversite"
                        placeholder="Örn: ODTÜ" 
                        value={targetUniversity} 
                        onChange={(e) => setTargetUniversity(e.target.value)} 
                    />
                    <Input 
                        label="Hedef Bölüm"
                        placeholder="Örn: Bilgisayar Mühendisliği" 
                        value={targetDepartment} 
                        onChange={(e) => setTargetDepartment(e.target.value)} 
                    />
                </div>

                <div className={styles.levelRow}>
                    <Input 
                        label="Haftalık Hedef Çalışma (Dakika)"
                        placeholder="Örn: 1200" 
                        value={weeklyTargetMinutes} 
                        onChange={(e) => setWeeklyTargetMinutes(e.target.value)} 
                        type="number" 
                    />
                    <Input 
                        label="Haftalık Hedef Soru Adedi"
                        placeholder="Örn: 500" 
                        value={weeklyTargetQuestions} 
                        onChange={(e) => setWeeklyTargetQuestions(e.target.value)} 
                        type="number" 
                    />
                </div>

                {submitError && (
                    <div className={styles.errorMessage}>{submitError}</div>
                )}

                <div className={styles.actions}>
                    <Button variant="ghost" type="button" onClick={handleClose}>
                        İptal
                    </Button>
                    <Button variant="primary" type="submit" isLoading={submitting} disabled={!firstName.trim() || !lastName.trim()}>
                        Kaydet
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
