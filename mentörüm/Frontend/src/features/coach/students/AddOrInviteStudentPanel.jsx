import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input, { Select } from '../../../components/common/Input/Input';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import { STUDENT_GRADES, STUDENT_TRACKS } from '../../../constants/domainConstants';
import { CheckCircle2, Mail, Zap, ChevronDown, Copy, Check, Search, UserPlus } from 'lucide-react';
import {
  useSendInvite,
  usePendingInvites,
  useCreateStudent,
  useSearchIndependentStudents,
  useCoachConnectionRequests,
  useSendCoachConnectionRequest,
  useRespondCoachConnectionRequest,
} from '../coachApi';
import styles from './CoachStudents.module.css';

const AddOrInviteStudentPanel = ({ showAddForm, onCloseAddForm, programs }) => {
  const { data: pendingInvites } = usePendingInvites();
  const { data: connectionRequests = [] } = useCoachConnectionRequests();
  const sendInvite = useSendInvite();
  const createStudent = useCreateStudent();
  const sendConnReq = useSendCoachConnectionRequest();
  const respondConnReq = useRespondCoachConnectionRequest();

  const [formMode, setFormMode] = useState('DIRECT'); // 'DIRECT' | 'INVITE' | 'SEARCH_INDEPENDENT'
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMsg, setSearchMsg] = useState('');
  const { data: searchResults = [], isFetching: isSearching } = useSearchIndependentStudents(searchQuery);

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
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard?.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <>
      {showAddForm && (
        <Card className={styles.addFormCard}>
          <SegmentedTabs
            activeTab={formMode}
            onChange={(id) => {
              setFormMode(id);
              setDirectError('');
              setDirectSuccessData(null);
              setInviteMsg('');
              setSearchMsg('');
            }}
            tabs={[
              { id: 'DIRECT', label: '⚡ Doğrudan Ekle (Hızlı Kayıt)', icon: <Zap size={14} /> },
              { id: 'INVITE', label: '✉️ E-posta ile Davet Gönder', icon: <Mail size={14} /> },
              { id: 'SEARCH_INDEPENDENT', label: '🔍 Bağımsız Öğrenci Ara', icon: <Search size={14} /> },
            ]}
          />

          {formMode === 'SEARCH_INDEPENDENT' ? (
            <div className={styles.directForm}>
              <Input
                label="Bağımsız Öğrenci Ara (Ad Soyad, E-posta veya Telefon)"
                placeholder="En az 2 karakter yazın (Örn: Ayşe, ayse@mail.com, 05...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchMsg('');
                }}
              />
              <p className={styles.directHint}>
                <Search size={14} />
                <span>Yalnızca koçu olmayan bağımsız öğrenciler listelenir. İstek gönderdiğiniz öğrenci kabul ettiğinde koçluk ilişkiniz başlar.</span>
              </p>
              {searchMsg && <div className={styles.inviteSuccessInline}><span>{searchMsg}</span></div>}
              {isSearching && <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)' }}>Aranıyor...</p>}
              {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)' }}>Eşleşen bağımsız öğrenci bulunamadı.</p>
              )}
              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {searchResults.map((cand) => (
                    <div
                      key={cand.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-color-surface)',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{cand.fullName}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-color-muted)' }}>
                          {cand.email || 'E-posta yok'}
                          {cand.phone ? ` · ${cand.phone}` : ''}
                          {cand.grade ? ` · ${cand.grade}. Sınıf` : ''}
                          {cand.track ? ` · ${cand.track}` : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={cand.hasPendingRequest ? 'outline' : 'primary'}
                        disabled={cand.hasPendingRequest || sendConnReq.isPending}
                        onClick={async () => {
                          try {
                            await sendConnReq.mutateAsync({ targetUserId: cand.id, note: null });
                            setSearchMsg(`${cand.fullName} adlı öğrenciye bağlantı isteği gönderildi.`);
                          } catch (err) {
                            setSearchMsg(err?.response?.data?.error || 'İstek gönderilemedi.');
                          }
                        }}
                      >
                        <UserPlus size={14} />
                        <span>{cand.hasPendingRequest ? 'İstek Bekliyor' : 'İstek Gönder'}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.formActions}>
                <Button variant="ghost" type="button" onClick={onCloseAddForm}>
                  Kapat
                </Button>
              </div>
            </div>
          ) : formMode === 'DIRECT' ? (
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
                  <Select
                    label="Sınıf Seviyesi"
                    value={directClassLevel}
                    onChange={(e) => setDirectClassLevel(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {STUDENT_GRADES.map((g) => (
                      <option key={g} value={g === 'Mezun' ? '13' : g}>
                        {g === 'Mezun' ? 'Mezun' : `${g}. Sınıf`}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Hedef Sınav / Alan"
                    value={directTargetExam}
                    onChange={(e) => setDirectTargetExam(e.target.value)}
                  >
                    <option value="">Seçiniz (opsiyonel)</option>
                    {STUDENT_TRACKS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
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
                <Select
                  label="Program Seçin *"
                  value={effectiveInviteProgramId}
                  onChange={(e) => setInviteProgramId(e.target.value)}
                  required
                >
                  {programs?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
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

      {connectionRequests && connectionRequests.length > 0 && (
        <Card className={styles.pendingCard} style={{ marginBottom: 14 }}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <UserPlus size={16} color="var(--color-primary)" />
              <strong style={{ fontSize: '0.92rem' }}>
                Bağlantı İstekleri ({connectionRequests.length})
              </strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectionRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{req.studentName}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-color-muted)' }}>
                      {req.studentEmail || ''} ·{' '}
                      {req.initiatedBy === 'Student'
                        ? 'Öğrenci sizinle çalışmak için istek gönderdi'
                        : 'Gönderdiğiniz istek öğrenci onayını bekliyor'}
                    </div>
                  </div>
                  {req.initiatedBy === 'Student' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={respondConnReq.isPending}
                        onClick={() => respondConnReq.mutateAsync({ requestId: req.id, accept: true })}
                      >
                        ✓ Kabul Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={respondConnReq.isPending}
                        onClick={() => respondConnReq.mutateAsync({ requestId: req.id, accept: false })}
                      >
                        ✕ Reddet
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge status="PENDING" label="Öğrenci Onayı Bekleniyor" />
                  )}
                </div>
              ))}
            </div>
          </div>
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
                    <StatusBadge status="PENDING" />
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

