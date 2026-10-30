import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, Copy, CheckCircle2 } from 'lucide-react';
import { usePrograms, useProgramCoaches, useRemoveProgramCoach, useTransferAdmin } from '../coachSchoolApi';
import { useSendInvite } from '../coachApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import Modal from '../../../components/common/Modal/Modal';
import styles from './CoachProgramSettingsPage.module.css';

const CoachProgramSettingsPage = ({ programId: propProgramId, embedded = false }) => {
  const { programId: routeProgramId } = useParams();
  const { data: programs = [] } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState('');

  const programId = propProgramId || routeProgramId || selectedProgramId || (programs.length > 0 ? programs[0].id : '');
  const { data: coaches, isLoading } = useProgramCoaches(programId);
  const removeCoach = useRemoveProgramCoach();
  const transferAdmin = useTransferAdmin();
  const sendInvite = useSendInvite();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleOpenInvite = () => {
    setInviteEmail('');
    setInviteError('');
    setCreatedInvite(null);
    setCopied(false);
    setIsInviteModalOpen(true);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !programId) return;
    setInviteError('');
    try {
      const res = await sendInvite.mutateAsync({
        email: inviteEmail.trim(),
        role: 'Coach',
        relatedId: programId,
        sendEmail: true
      });
      setCreatedInvite(res);
    } catch (err) {
      setInviteError(err?.response?.data?.error || 'Yardımcı koç daveti oluşturulamadı.');
    }
  };

  const handleCopyCode = (code) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={embedded ? styles.containerEmbedded : styles.container}>
      {!embedded && <h1 className={styles.title}>Program & Yardımcı Koç Ayarları</h1>}

      <Card className={styles.headerCard} padding="md">
        <div className={styles.headerRow}>
          <div>
            <h3 className={styles.sectionTitle}>Program Yöneticileri & Yardımcı Koçlar</h3>
            <p className={styles.sectionSubtitle}>
              Koçluk programınıza yardımcı koç davet edebilir veya yönetici yetkisini devredebilirsiniz.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {programs.length > 1 && !propProgramId && !routeProgramId && (
              <select
                className={styles.select}
                value={programId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <Button onClick={handleOpenInvite} size="sm" variant="primary">
              <UserPlus size={15} />
              <span>+ Yardımcı Koç Davet Et</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {coaches?.map((c) => (
          <Card key={c.coachId} className={styles.item} padding="md">
            <div className={styles.itemHeader}>
              <div>
                <strong className={styles.coachName}>{c.fullName}</strong>
                <div className={styles.email}>{c.email}</div>
              </div>
              <span className={c.role === 'YONETICI' ? styles.badgeAdmin : styles.badgeAssistant}>
                {c.role === 'YONETICI' ? 'Yönetici Koç' : 'Yardımcı Koç'}
              </span>
            </div>
            {c.role === 'YARDIMCI' && (
              <div className={styles.actions}>
                <Button size="sm" variant="outline" onClick={() => transferAdmin.mutateAsync({ programId, coachId: c.coachId })}>
                  Yönetici Yap
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  onClick={() => removeCoach.mutateAsync({ programId, coachId: c.coachId })}
                >
                  Programdan Çıkar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Yardımcı Koç Davet Et"
        maxWidth="440px"
      >
        {!createdInvite ? (
          <form onSubmit={handleInviteSubmit} className={styles.modalForm}>
            <p className={styles.modalHint}>
              Davet edeceğiniz yardımcı koçun e-posta adresini girin. Oluşturulan davet bağlantısını doğrudan da paylaşabilirsiniz.
            </p>
            <Input
              label="Yardımcı Koç E-postası *"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="koc@ornek.com"
              required
              error={inviteError}
            />
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" variant="primary" isLoading={sendInvite.isPending} disabled={!inviteEmail.trim()}>
                Davet Oluştur
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.inviteSuccessBox}>
            <div className={styles.inviteSuccessHeader}>
              <CheckCircle2 size={20} color="var(--color-success, #16a34a)" />
              <strong>Davet Bağlantısı Hazır!</strong>
            </div>
            <p className={styles.modalHint}>
              Davet Kodu: <code>{createdInvite.code}</code>
            </p>
            <div className={styles.modalActions}>
              <Button type="button" variant="outline" onClick={() => handleCopyCode(createdInvite.code)}>
                <Copy size={14} />
                <span>{copied ? 'Bağlantı Kopyalandı!' : 'Davet Linkini Kopyala'}</span>
              </Button>
              <Button type="button" variant="primary" onClick={() => setIsInviteModalOpen(false)}>
                Tamam
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CoachProgramSettingsPage;
