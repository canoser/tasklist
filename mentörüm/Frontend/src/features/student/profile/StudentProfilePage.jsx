import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useStudentProfile, 
  useStudentExams, 
  useStudentGoal, 
  useUpdateStudentGoal,
  useStudentSubjectStats,
  useCreateStudentExam,
  useDeleteStudentExam,
  useSearchCoachesForStudent,
  useStudentConnectionRequests,
  useSendStudentConnectionRequest,
  useRespondStudentConnectionRequest,
  useUnlinkCoach,
} from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import ChangePasswordCard from '../../../components/common/ChangePasswordCard/ChangePasswordCard';
import { Palette, FolderOpen, ChevronRight, Clock, FileText, UserPlus, Trash2, Plus, ShieldCheck } from 'lucide-react';
import styles from './StudentProfilePage.module.css';

const fmt = (d) => (d ? String(d).slice(0, 10) : '');

const StudentProfilePage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useStudentProfile();
  const { data: exams } = useStudentExams();
  const { data: subjectStats = [] } = useStudentSubjectStats();
  const { data: goal } = useStudentGoal();
  const { data: connRequests = [] } = useStudentConnectionRequests();
  const updateGoal = useUpdateStudentGoal();
  const createExam = useCreateStudentExam();
  const deleteExam = useDeleteStudentExam();
  const sendConnReq = useSendStudentConnectionRequest();
  const respondConnReq = useRespondStudentConnectionRequest();
  const unlinkCoach = useUnlinkCoach();

  const [tab, setTab] = useState('exams');
  const [uni, setUni] = useState('');
  const [dept, setDept] = useState('');
  const [score, setScore] = useState('');
  const [goalMsg, setGoalMsg] = useState('');

  const [coachQuery, setCoachQuery] = useState('');
  const [connMsg, setConnMsg] = useState('');
  const { data: coachCandidates = [], isFetching: isSearchingCoaches } = useSearchCoachesForStudent(coachQuery);

  const [showExamModal, setShowExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState('TYT');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [examTotalNet, setExamTotalNet] = useState('');

  const hasCoach = Boolean(profile?.hasCoach);
  const perms = profile?.permissions || {};
  const canEditGoals = !hasCoach || perms.canEditGoals !== false;
  const canAddExamResults = !hasCoach || perms.canAddExamResults === true;

  useEffect(() => {
    if (goal) {
      setUni(goal.targetUniversity || '');
      setDept(goal.targetDepartment || '');
      setScore(goal.targetScore != null ? String(goal.targetScore) : '');
    }
  }, [goal]);

  const saveGoal = async (e) => {
    e.preventDefault();
    if (!canEditGoals) return;
    setGoalMsg('');
    try {
      await updateGoal.mutateAsync({
        targetUniversity: uni || null,
        targetDepartment: dept || null,
        targetScore: score ? parseFloat(score) : null,
      });
      setGoalMsg('Hedef güncellendi.');
    } catch (err) {
      setGoalMsg(err?.response?.data?.error || 'Güncelleme başarısız.');
    }
  };

  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!examName.trim() || !examTotalNet) return;
    await createExam.mutateAsync({
      examDate,
      examType,
      examName: examName.trim(),
      totalNet: parseFloat(examTotalNet),
      notes: null,
      errorReasons: null,
      scores: [],
    });
    setExamName('');
    setExamTotalNet('');
    setShowExamModal(false);
  };

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>

      <Card className={styles.card} padding="lg">
        <div className={styles.identity}>
          <div className={styles.avatar}>{profile?.fullName?.charAt(0) || 'Ö'}</div>
          <div>
            <h2 className={styles.name}>{profile?.fullName}</h2>
            <p className={styles.meta}>{profile?.email}</p>
            {profile?.grade != null && <span className={styles.badge}>Sınıf: {profile.grade}</span>}
            {profile?.track && <span className={styles.badge}>Alan: {profile.track}</span>}
          </div>
        </div>

        {profile?.parents?.length > 0 && (
          <div className={styles.parents}>
            <h3 className={styles.sectionTitle}>Velilerim</h3>
            {profile.parents.map((p) => (
              <div key={p.parentId} className={styles.parentRow}>
                <span>{p.parentName}</span>
                {p.relation && <span className={styles.meta}> ({p.relation})</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hızlı Erişim: Temalar ve Dosyalar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={() => navigate('/student/theme')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color-surface, var(--bg-card))',
            color: 'var(--text-color-main)',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Palette size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Görünüm & Tema</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-muted)' }}>Renkler ve Efektler</div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-color-muted)" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/student/storage')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color-surface, var(--bg-card))',
            color: 'var(--text-color-main)',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Dosyalarım</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-muted)' }}>Bulut Depolama</div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-color-muted)" />
        </button>
      </div>

      {/* Koç Bağlantısı & Bağımsız Öğrenci Modu */}
      <Card className={styles.card} padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="var(--color-primary)" />
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
              {hasCoach ? 'Koçluk Bağlantım' : 'Çalışma Modum: Bağımsız Öğrenci'}
            </h3>
          </div>
          <StatusBadge
            status={hasCoach ? 'APPROVED' : 'PENDING'}
            label={hasCoach ? `👨‍🏫 Koç: ${profile?.coachName || 'Aktif'}` : '🌱 Bağımsız Öğrenci Modu'}
          />
        </div>

        {hasCoach ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
              Şu anda <strong>{profile?.coachName}</strong> ({profile?.coachEmail}) ile çalışıyorsunuz. Koçunuzun tanıdığı yetkiler doğrultusunda hedef, konu, ödev, sınav ve kaynak işlemlerini yapabilirsiniz.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="sm"
                variant="outline"
                isLoading={unlinkCoach.isPending}
                onClick={async () => {
                  if (!window.confirm('Koçunuzla bağlantınızı sonlandırıp bağımsız öğrenci moduna geçmek istediğinize emin misiniz? Tüm verileriniz kişisel hesabınızda korunacaktır.')) return;
                  await unlinkCoach.mutateAsync();
                }}
              >
                Koçtan Ayrıl (Bağımsız Moda Geç)
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
              Sistemi kendi başınıza tam yetkiyle kullanabilirsiniz (konu tamamlama, hedef belirleme, ödev/çalışma ekleme, deneme neti girme ve kaynak/video ekleme). Bir koçla çalışmak isterseniz aşağıdan aratarak istek gönderebilirsiniz.
            </p>

            {connRequests.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <strong style={{ fontSize: '0.84rem' }}>Bekleyen Koçluk İstekleri ({connRequests.length})</strong>
                {connRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem' }}>{req.coachName}</strong>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-color-muted)' }}>
                        {req.coachEmail} ·{' '}
                        {req.initiatedBy === 'Coach'
                          ? 'Koç sizi çalışma programına davet ediyor'
                          : 'Gönderdiğiniz istek koç onayını bekliyor'}
                      </div>
                    </div>
                    {req.initiatedBy === 'Coach' ? (
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
                      <StatusBadge status="PENDING" label="Koç Onayı Bekleniyor" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input
                label="Koç Ara (Ad Soyad, E-posta veya Telefon)"
                placeholder="En az 2 karakter yazın..."
                value={coachQuery}
                onChange={(e) => {
                  setCoachQuery(e.target.value);
                  setConnMsg('');
                }}
              />
              {connMsg && <span className={styles.msg}>{connMsg}</span>}
              {isSearchingCoaches && <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>Aranıyor...</span>}
              {coachCandidates.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem' }}>{c.fullName}</strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-color-muted)' }}>
                      {c.email || ''}
                      {c.phone ? ` · ${c.phone}` : ''}
                      {c.specialty ? ` · ${c.specialty}` : ''}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={c.hasPendingRequest ? 'outline' : 'primary'}
                    disabled={c.hasPendingRequest || sendConnReq.isPending}
                    onClick={async () => {
                      try {
                        await sendConnReq.mutateAsync({ targetUserId: c.id, note: null });
                        setConnMsg(`${c.fullName} adlı koça bağlantı isteği gönderildi.`);
                      } catch (err) {
                        setConnMsg(err?.response?.data?.error || 'İstek gönderilemedi.');
                      }
                    }}
                  >
                    <UserPlus size={14} />
                    <span>{c.hasPendingRequest ? 'İstek Bekliyor' : 'İstek Gönder'}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Hedef */}
      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Hedefim</h3>
        {!canEditGoals && (
          <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
            🔒 Hedef güncelleme yetkisi koçunuz tarafından kapatılmıştır.
          </p>
        )}
        <form onSubmit={saveGoal} className={styles.goalForm}>
          <Input label="Hedef Üniversite" value={uni} onChange={(e) => setUni(e.target.value)} placeholder="örn. İTÜ" disabled={!canEditGoals} />
          <Input label="Hedef Bölüm" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="örn. Bilgisayar Müh." disabled={!canEditGoals} />
          <Input label="Hedef Net" type="number" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} placeholder="örn. 95.5" disabled={!canEditGoals} />
          {canEditGoals && <Button type="submit" isLoading={updateGoal.isPending}>Kaydet</Button>}
          {goalMsg && <span className={styles.msg}>{goalMsg}</span>}
        </form>
      </Card>

      {/* Şifre Oluştur / Değiştir */}
      <ChangePasswordCard className={styles.card} idPrefix="student" />

      {/* Sekmeler */}
      <SegmentedTabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: 'exams', label: 'Sınav Sonuçları' },
          { id: 'subjectStats', label: 'Konu İstatistikleri', count: subjectStats.length },
        ]}
      />

      {tab === 'exams' && (
        <div>
          {canAddExamResults && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <Button size="sm" onClick={() => setShowExamModal(true)}>
                <Plus size={14} /> + Deneme / Sınav Sonucu Ekle
              </Button>
            </div>
          )}
          {exams?.length === 0 && <p className={styles.empty}>Henüz sınav sonucu yok.</p>}
          {exams?.map((e) => (
            <Card key={e.id} className={styles.row} padding="md">
              <div>
                <strong>{e.examName || e.examType || 'Sınav'}</strong>
                <span className={styles.meta}> {fmt(e.examDate)}</span>
                {e.createdByStudent && (
                  <span style={{ marginLeft: 8, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 6, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    👤 Ben Ekledim
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={styles.net}>Net: {e.totalNet ?? '-'}</span>
                {canAddExamResults && e.createdByStudent && (
                  <Button
                    size="xs"
                    variant="ghost"
                    iconOnly
                    onClick={() => deleteExam.mutateAsync({ examId: e.id })}
                    title="Sınav sonucunu sil"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        title="Yeni Deneme / Sınav Sonucu Ekle"
        maxWidth="420px"
      >
        <form onSubmit={handleAddExam} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Deneme / Sınav Adı *"
            placeholder="Örn: Özdebir TYT-3"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            required
          />
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 4, fontWeight: 600 }}>Sınav Türü</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-color-surface)', color: 'var(--text-color-primary)' }}
            >
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
              <option value="LGS">LGS</option>
              <option value="Deneme">Genel Deneme</option>
              <option value="Okul">Okul Sınavı</option>
            </select>
          </div>
          <Input
            label="Sınav Tarihi *"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            required
          />
          <Input
            label="Toplam Net *"
            type="number"
            step="0.25"
            placeholder="Örn: 84.75"
            value={examTotalNet}
            onChange={(e) => setExamTotalNet(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowExamModal(false)}>
              İptal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createExam.isPending}>
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {tab === 'subjectStats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {subjectStats.length === 0 && (
            <p className={styles.empty}>Henüz konu bazlı çalışma verisi kaydedilmemiş.</p>
          )}
          {subjectStats.map((st, idx) => (
            <Card key={idx} className={styles.row} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{st.subjectName} — {st.topicName}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {st.totalMinutes || 0} dk</span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileText size={13} /> {st.totalQuestions || 0} Soru</span>
                  <span style={{ marginLeft: '4px', fontSize: '0.78rem' }}>
                    ({st.totalCorrect || 0} D / {st.totalWrong || 0} Y / {st.totalBlank || 0} B)
                  </span>
                </div>
              </div>
              <span className={styles.net} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {st.totalNet != null ? `${st.totalNet} Net` : '-'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentProfilePage;
