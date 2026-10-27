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
