import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { CheckCircle2, Mail, Zap, ChevronDown, Copy, Check } from 'lucide-react';
import { useSendInvite, usePendingInvites, useCreateStudent } from '../coachApi';
import styles from './CoachStudents.module.css';

const AddOrInviteStudentPanel = ({ showAddForm, onCloseAddForm, programs }) => {
  const { data: pendingInvites } = usePendingInvites();
  const sendInvite = useSendInvite();
  const createStudent = useCreateStudent();

  const [formMode, setFormMode] = useState('DIRECT'); // 'DIRECT' | 'INVITE'
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  // Doğrudan Ekleme Form State
  const [directFirstName, setDirectFirstName] = useState('');
  const [directLastName, setDirectLastName] = useState('');
  const [directClassLevel, setDirectClassLevel] = useState('');
  const [directTargetExam, setDirectTargetExam] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [directSuccessData, setDirectSuccessData] = useState(null);
  const [directError, setDirectError] = useState('');
  const [directCopied, setDirectCopied] = useState(false);

  // E-posta ile Davet Gönder Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProgramId, setInviteProgramId] = useState('');
  const [inviteSendEmail, setInviteSendEmail] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  const effectiveInviteProgramId = inviteProgramId || programs?.[0]?.id || '';

  const handleDirectCreate = async (e) => {
    e.preventDefault();
    if (!directFirstName.trim() || !directLastName.trim()) return;
    setDirectError('');
    setDirectSubmitting(true);
    try {
      await createStudent.mutateAsync({
        firstName: directFirstName.trim(),
        lastName: directLastName.trim(),
        classLevel: directClassLevel ? parseInt(directClassLevel, 10) : undefined,
        targetExam: directTargetExam || undefined,
        email: directEmail.trim() || undefined,
      });
      setDirectSuccessData({
        fullName: `${directFirstName.trim()} ${directLastName.trim()}`,
        programName: 'Bireysel Koçluk',
        email: directEmail.trim() || null,
        classLevel: directClassLevel || null,
        targetExam: directTargetExam || null,
      });
      setDirectFirstName('');
      setDirectLastName('');
      setDirectEmail('');
      setDirectClassLevel('');
      setDirectTargetExam('');
    } catch (err) {
      setDirectError(err?.response?.data?.error || 'Öğrenci eklenemedi.');
    } finally {
      setDirectSubmitting(false);
    }
  };

  const handleCopyDirectInfo = () => {
    if (!directSuccessData) return;
    const lines = [
      `Öğrenci: ${directSuccessData.fullName}`,
      `Program: ${directSuccessData.programName}`,
    ];
    if (directSuccessData.classLevel) lines.push(`Sınıf: ${directSuccessData.classLevel}. Sınıf`);
    if (directSuccessData.targetExam) lines.push(`Hedef: ${directSuccessData.targetExam}`);
    if (directSuccessData.email) lines.push(`E-posta: ${directSuccessData.email}`);
    lines.push('Mentörüm Öğrenci Portalı');
    navigator.clipboard?.writeText(lines.join('\n'));
    setDirectCopied(true);
    setTimeout(() => setDirectCopied(false), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !effectiveInviteProgramId) {
      setInviteMsg('E-posta ve program seçimi zorunludur.');
      return;
    }
    setInviteMsg('');
    try {
      const res = await sendInvite.mutateAsync({
        email: inviteEmail.trim(),
        role: 'Student',
        relatedId: effectiveInviteProgramId,
        sendEmail: inviteSendEmail,
      });

      if (res.directAdded) {
        setInviteMsg(res.message);
      } else {
        setInviteMsg(
          inviteSendEmail
            ? `Davet oluşturuldu ve e-posta gönderildi. Kod: ${res.code}`
            : `Davet oluşturuldu. Kod: ${res.code} (Bekleyen Davetler listesine eklendi)`
        );
      }
      setInviteEmail('');
    } catch (err) {
      setInviteMsg(err?.response?.data?.error || 'Davet gönderilemedi.');
    }
  };

  const handleCopyLink = (code) => {
    const link = `https://mentorum.dersmatris.com/invite/${code}`;
    navigator.clipboard?.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <>
      {showAddForm && (
        <Card className={styles.addFormCard}>
          <div className={styles.formModeTabs}>
            <button
              type="button"
              className={`${styles.formModeBtn} ${formMode === 'DIRECT' ? styles.formModeBtnActive : ''}`}
              onClick={() => { setFormMode('DIRECT'); setDirectError(''); setDirectSuccessData(null); }}
            >
              <Zap size={14} />
              <span>⚡ Doğrudan Ekle (Hızlı Kayıt)</span>
            </button>
            <button
              type="button"
              className={`${styles.formModeBtn} ${formMode === 'INVITE' ? styles.formModeBtnActive : ''}`}
              onClick={() => { setFormMode('INVITE'); setInviteMsg(''); }}
            >
              <Mail size={14} />
              <span>✉️ E-posta ile Davet Gönder</span>
            </button>
          </div>

          {formMode === 'DIRECT' ? (
            directSuccessData ? (
              <div className={styles.successPanel}>
                <div className={styles.successIconRow}>
                  <CheckCircle2 size={24} className={styles.successIcon} />
                  <div>
                    <h4 className={styles.successTitle}>Öğrenci Başarıyla Eklendi</h4>
                    <p className={styles.successDesc}>
                      <strong>{directSuccessData.fullName}</strong> aktif öğrenci listenize eklendi.
                    </p>
                  </div>
                </div>
                <div className={styles.shareBox}>
                  <div className={styles.shareInfo}>
                    <span>{directSuccessData.fullName} • {directSuccessData.programName}</span>
                    {directSuccessData.classLevel && <span> ({directSuccessData.classLevel}. Sınıf)</span>}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleCopyDirectInfo}>
                    {directCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{directCopied ? 'Kopyalandı!' : 'Bilgileri Kopyala'}</span>
                  </Button>
                </div>
                <div className={styles.successActions}>
                  <Button variant="secondary" size="sm" onClick={() => setDirectSuccessData(null)}>
                    + Başka Öğrenci Ekle
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onCloseAddForm}>
                    Kapat
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDirectCreate} className={styles.directForm}>
                <div className={styles.directRow}>
                  <Input
                    label="Öğrenci Adı *"
                    placeholder="Örn: Ahmet"
                    value={directFirstName}
                    onChange={(e) => setDirectFirstName(e.target.value)}
                    required
                  />
                  <Input
                    label="Öğrenci Soyadı *"
                    placeholder="Örn: Yılmaz"
                    value={directLastName}
                    onChange={(e) => setDirectLastName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.directRowThree}>
                  <div>
                    <label className={styles.selectLabel}>Sınıf Seviyesi</label>
                    <select
                      className={styles.select}
                      value={directClassLevel}
                      onChange={(e) => setDirectClassLevel(e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      <option value="8">8. Sınıf / LGS</option>
                      <option value="9">9. Sınıf</option>
                      <option value="10">10. Sınıf</option>
                      <option value="11">11. Sınıf</option>
                      <option value="12">12. Sınıf</option>
                      <option value="Mezun">Mezun</option>
                    </select>
                  </div>

                  <div>
                    <label className={styles.selectLabel}>Hedef Sınav / Alan</label>
                    <select
                      className={styles.select}
                      value={directTargetExam}
                      onChange={(e) => setDirectTargetExam(e.target.value)}
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
                  type="email"
                  placeholder="ogrenci@ornek.com (boş bırakılabilir)"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                />

                <p className={styles.directHint}>
                  <CheckCircle2 size={14} />
                  <span>Öğrenciye e-posta daveti gönderilmez; doğrudan koçun aktif listesine eklenir ve hemen ödev/planlama yapılabilir.</span>
                </p>

                {directError && <div className={styles.formError}>{directError}</div>}

                <div className={styles.formActions}>
                  <Button variant="ghost" type="button" onClick={onCloseAddForm}>
                    İptal
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={directSubmitting}
                    disabled={!directFirstName.trim() || !directLastName.trim()}
                  >
                    + Öğrenciyi Doğrudan Ekle
                  </Button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleInvite} className={styles.directForm}>
              <div className={styles.directRow}>
                <Input
                  label="Öğrenci E-postası *"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ogrenci@ornek.com"
                  required
                />
                <div>
                  <label className={styles.selectLabel}>Program Seçin *</label>
                  <select
                    className={styles.select}
                    value={effectiveInviteProgramId}
                    onChange={(e) => setInviteProgramId(e.target.value)}
                    required
                  >
                    {programs?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className={styles.directHint}>
                <Mail size={14} />
                <span>Davet kodu ve linki oluşturulur (kopyalayıp WhatsApp ile paylaşabilirsiniz). İsterseniz e-posta ile de gönderebilirsiniz.</span>
              </p>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-color-main)' }}>
                <input type="checkbox" checked={inviteSendEmail} onChange={(e) => setInviteSendEmail(e.target.checked)} /> E-posta ile de gönder
              </label>

              {inviteMsg && (
                <p className={styles.inviteSuccessInline}>
                  <CheckCircle2 size={16} />
                  <span>{inviteMsg}</span>
                </p>
              )}

              <div className={styles.formActions}>
                <Button variant="ghost" type="button" onClick={onCloseAddForm}>
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
        </Card>
      )}

      {pendingInvites && pendingInvites.length > 0 && (
        <Card className={styles.pendingCard}>
          <div
            className={styles.pendingAccordionHeader}
            onClick={() => setIsPendingOpen(!isPendingOpen)}
            role="button"
            tabIndex={0}
          >
            <div className={styles.pendingHeaderLeft}>
              <Mail size={16} className={styles.pendingMailIcon} />
              <span className={styles.pendingTitle}>Bekleyen Davetler ({pendingInvites.length})</span>
              <span className={styles.pendingSubtitle}>Öğrenci henüz sisteme giriş yapmadı</span>
            </div>
            <div className={styles.accordionToggle}>
              <span className={styles.toggleText}>{isPendingOpen ? 'Listeyi Gizle' : 'Listeyi Aç'}</span>
              <ChevronDown size={18} className={`${styles.chevron} ${isPendingOpen ? styles.chevronOpen : ''}`} />
            </div>
          </div>
          {isPendingOpen && (
            <div className={styles.pendingList}>
              {pendingInvites.map((inv) => (
                <div key={inv.id} className={styles.pendingItem}>
                  <div className={styles.pendingInfo}>
                    <div className={styles.pendingEmail}>{inv.email}</div>
                    <div className={styles.pendingMeta}>
                      <span>Program: <strong>{inv.programName || 'Genel'}</strong></span>
                      <span> • Kod: <code className={styles.codeBadge}>{inv.code}</code></span>
                    </div>
                  </div>
                  <div className={styles.pendingActions}>
                    <span className={styles.pendingBadge}>Bekliyor</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(inv.code)}
                    >
                      {copiedCode === inv.code ? 'Kopyalandı!' : 'Linki Kopyala'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
};

export default AddOrInviteStudentPanel;

