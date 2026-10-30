import { useRef, useState, useEffect } from 'react';
import { useUploads, useRecipients, useStorageUsage, useUploadFile, useRegisterDevice, useOpenUpload } from './storageApi';
import { registerCurrentDevice } from '../../utils/device';
import { useAuthStore } from '../auth/authStore';
import { useStudentCourses } from '../student/studentApi';
import { useStudents } from '../coach/coachApi';
import { useTeacherCourses, useTeacherCourseStudents } from '../teacher/teacherApi';
import LocalImageViewer from '../../components/common/LocalImageViewer/LocalImageViewer';
import DevicePickerModal from '../../components/common/DevicePickerModal/DevicePickerModal';
import Button from '../../components/common/Button/Button';
import SegmentedTabs from '../../components/common/SegmentedTabs/SegmentedTabs';
import { Settings, Upload, Image as ImageIcon, FileText, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import styles from './StoragePage.module.css';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function StoragePage() {
    const { user, viewAs } = useAuthStore();
    const effectiveRole = (user?.role === 'Coach' || user?.role === 'Admin') && viewAs ? viewAs.role : user?.role;

    const isCoach = effectiveRole === 'Coach' || effectiveRole === 'Admin';
    const isStudent = effectiveRole === 'Student';
    const isTeacher = effectiveRole === 'Teacher';

    const { data: uploads = [] } = useUploads();
    const { data: usage } = useStorageUsage(isCoach);
    const uploadFile = useUploadFile();
    const registerDevice = useRegisterDevice();

    const [tab, setTab] = useState('images');
    const [courseId, setCourseId] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const fileRef = useRef(null);

    // Cihaz tanıma: Kullanıcı sayfaya geldiğinde arka planda sessizce kaydedilir (T11 & T14)
    useEffect(() => {
        registerCurrentDevice()
            .then((d) => registerDevice.mutate(d))
            .catch(() => {});
    }, []);

    // Öğrenci için ders listesi ve alıcı seçenekleri
    const { data: studentCourses = [] } = useStudentCourses(isStudent);
    const { data: recipients = [] } = useRecipients(isStudent && courseId ? courseId : null);

    // Koç için öğrenci listesi
    const { data: coachStudents = [] } = useStudents(isCoach);

    // Öğretmen için ders ve dersin öğrencileri
    const { data: teacherCourses = [] } = useTeacherCourses(isTeacher);
    const { data: teacherStudents = [] } = useTeacherCourseStudents(isTeacher && courseId ? courseId : null);

    const filtered = uploads.filter((u) =>
        tab === 'images' ? IMAGE_TYPES.includes(u.contentType) : DOC_TYPES.includes(u.contentType)
    );

    async function handleFile(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        let targetProgramId = undefined;
        let targetRecipientId = recipientId || undefined;

        if (effectiveRole === 'Coach') {
            if (!recipientId) {
                alert('Lütfen dosyayı göndereceğiniz öğrenciyi seçin.');
                return;
            }
            const selectedStudent = coachStudents.find((s) => s.id === recipientId);
            targetProgramId = selectedStudent?.programId;
        } else if (effectiveRole === 'Teacher') {
            if (!courseId) {
                alert('Lütfen bir ders seçin.');
                return;
            }
            if (!recipientId) {
                alert('Lütfen dosyayı göndereceğiniz öğrenciyi seçin.');
                return;
            }
        }

        try {
            await uploadFile.mutateAsync({
                file,
                programId: targetProgramId,
                courseId: courseId || undefined,
                recipientUserId: targetRecipientId,
            });
            alert('Dosya başarıyla yüklendi.');
        } catch (err) {
            alert('Yükleme başarısız: ' + (err?.response?.data?.error || err?.message || 'bilinmeyen hata'));
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className={styles.heading} style={{ margin: 0 }}>Dosyalarım</h2>
                        <Button 
                            type="button" 
                            variant="outline"
                            size="xs"
                            iconOnly
                            onClick={() => setPickerOpen(true)}
                            title="İndirme Cihazı Ayarı"
                        >
                            <Settings size={17} />
                        </Button>
                    </div>
                    <p className={styles.subheading} style={{ marginTop: '4px' }}>Resimler, ödev ekleri ve paylaşılan ders belgeleri</p>
                </div>
            </div>

            {usage?.shouldWarn && (
                <div className={styles.warn} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>
                        Depolama alanınız %{usage.usedPercent} dolu ({usage.usedMb} MB / {usage.quotaMb} MB).{' '}
                        {usage.storageMode === 'LOCAL' ? 'Cihazınıza indirerek bulutta yer açabilirsiniz.' : 'Kota sınırına yaklaşıyorsunuz.'}
                    </span>
                </div>
            )}

            <div className={styles.uploadCard}>
                <div className={styles.uploadRow}>
                    {/* Öğrenci Rolü: İsteğe bağlı Ders ve Alıcı Seçimi */}
                    {effectiveRole === 'Student' && (
                        <>
                            <select 
                                className={styles.select} 
                                value={courseId} 
                                onChange={(e) => { 
                                    setCourseId(e.target.value); 
                                    setRecipientId(''); 
                                }}
                            >
                                <option value="">Genel (Doğrudan Koça Gönder)</option>
                                {studentCourses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            {recipients.length > 1 && (
                                <select 
                                    className={styles.select} 
                                    value={recipientId} 
                                    onChange={(e) => setRecipientId(e.target.value)}
                                >
                                    <option value="">Alıcı Seçin</option>
                                    {recipients.map((r) => (
                                        <option key={r.userId} value={r.userId}>
                                            {r.fullName} ({r.role === 'Teacher' ? 'Öğretmen' : 'Koç'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}

                    {/* Koç Rolü: Öğrenci Seçimi */}
                    {effectiveRole === 'Coach' && (
                        <select 
                            className={styles.select} 
                            value={recipientId} 
                            onChange={(e) => setRecipientId(e.target.value)}
                        >
                            <option value="">Alıcı Öğrenciyi Seçin *</option>
                            {coachStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.fullName} {s.email ? `(${s.email})` : ''}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Öğretmen Rolü: Ders ve Öğrenci Seçimi */}
                    {effectiveRole === 'Teacher' && (
                        <>
                            <select 
                                className={styles.select} 
                                value={courseId} 
                                onChange={(e) => {
                                    setCourseId(e.target.value);
                                    setRecipientId('');
                                }}
                            >
                                <option value="">Ders Seçin *</option>
                                {teacherCourses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            {courseId && (
                                <select 
                                    className={styles.select} 
                                    value={recipientId} 
                                    onChange={(e) => setRecipientId(e.target.value)}
                                >
                                    <option value="">Alıcı Öğrenciyi Seçin *</option>
                                    {teacherStudents.map((s) => (
                                        <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}

                    <Button 
                        variant="primary"
                        size="sm"
                        disabled={uploadFile.isPending} 
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload size={15} />
                        <span>{uploadFile.isPending ? 'Yükleniyor…' : 'Dosya Yükle'}</span>
                    </Button>
                    <input 
                        ref={fileRef} 
                        type="file" 
                        hidden 
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx" 
                        onChange={handleFile} 
                    />
                </div>
                <p className={styles.disclaimer}>
                    Resimler otomatik olarak WebP formatına optimize edilir.
                </p>
            </div>

            <SegmentedTabs
                activeTab={tab}
                onChange={setTab}
                tabs={[
                    {
                        id: 'images',
                        label: 'Resimler',
                        icon: <ImageIcon size={15} />,
                        count: uploads.filter((u) => IMAGE_TYPES.includes(u.contentType)).length,
                    },
                    {
                        id: 'docs',
                        label: 'Belgeler',
                        icon: <FileText size={15} />,
                        count: uploads.filter((u) => DOC_TYPES.includes(u.contentType)).length,
                    },
                ]}
            />

            <div className={styles.receiveNotice}>
                <Info size={14} className={styles.infoIcon} />
                <span>İndirilen dosyalar otomatik virüs taramasından geçmez; güvenmediğiniz kaynaklardan gelen dosyaları açarken dikkatli olunuz.</span>
            </div>

            <div className={styles.grid}>
                {filtered.map((u) => (
                    <div key={u.id} className={styles.card}>
                        {IMAGE_TYPES.includes(u.contentType) ? (
                            <LocalImageViewer uploadId={u.id} originalName={u.originalName} />
                        ) : (
                            <DocItem upload={u} />
                        )}
                        <div className={styles.cardMeta}>
                            <span className={styles.name} title={u.originalName}>{u.originalName}</span>
                            <span className={styles.size}>{(u.sizeBytes / 1024).toFixed(0)} KB</span>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className={styles.empty}>Bu sekmede henüz dosya bulunmuyor.</div>
                )}
            </div>

            <DevicePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
        </div>
    );
}

function DocItem({ upload }) {
    const { openUpload } = useOpenUpload();

    return (
        <button className={styles.docBtn} onClick={() => openUpload(upload.id)}>
            <span className={styles.docIcon} style={{ display: 'inline-flex', alignItems: 'center' }}><FileText size={16} /></span>
            <span className={styles.docName}>{upload.originalName}</span>
            <span className={styles.docAction} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                Aç / İndir <ExternalLink size={12} />
            </span>
        </button>
    );
}
