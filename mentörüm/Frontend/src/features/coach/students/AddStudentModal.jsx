import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import styles from './AddStudentModal.module.css';

// V13 F1: Akıllı öğrenci ekleme (gölge profil destekli).
export default function AddStudentModal({ open, onClose, groupId, groupName, onSubmit }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) return;
        setSubmitError('');
        setSubmitting(true);
        try {
            await onSubmit({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim() || undefined,
                classLevel: classLevel ? parseInt(classLevel, 10) : undefined,
                targetExam: targetExam || undefined,
                groupId: groupId || undefined,
            });
            setFirstName('');
            setLastName('');
            setEmail('');
            setClassLevel('');
            setTargetExam('');
        } catch (err) {
            setSubmitError(err?.response?.data?.error || err?.message || 'Öğrenci eklenemedi.');
        } finally {
            setSubmitting(false);
        }
    }

    const handleClose = () => {
        setSubmitError('');
        onClose();
    };

    return (
        <Modal isOpen={open} onClose={handleClose} title="Yeni Öğrenci Ekle" maxWidth="460px">
            {groupId && (
                <div className={styles.groupNote}>
                    Bu öğrenci <strong>{groupName || 'ilgili gruba'}</strong> dahil edilecektir.
                </div>
            )}
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
                        placeholder="örn. 11" 
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

                <Input
                    label="E-posta (İsteğe Bağlı)"
                    placeholder="ogrenci@ornek.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                />
                <p className={styles.emailHint}>
                    E-posta girilmezse öğrenci doğrudan gölge profil olarak açılır, sonradan davet gönderebilirsiniz.
                </p>

                {submitError && (
                    <div className={styles.errorMessage}>{submitError}</div>
                )}

                <div className={styles.actions}>
                    <Button variant="ghost" type="button" onClick={handleClose}>
                        İptal
                    </Button>
                    <Button variant="primary" type="submit" isLoading={submitting} disabled={!firstName.trim() || !lastName.trim()}>
                        Öğrenciyi Ekle
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

