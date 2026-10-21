import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useUploads, useRecipients, useStorageUsage, useCreateUploadUrl, useConfirmUpload, useRegisterDevice, useDownloadUrl } from './storageApi';
import { compressImage } from '../../utils/imageCompressor';
import { registerCurrentDevice } from '../../utils/device';
import { useAuthStore } from '../auth/authStore';
import { useStudentCourses } from '../student/studentSchoolApi';
import { useStudents } from '../coach/coachApi';
import { useTeacherCourses, useTeacherCourseStudents } from '../teacher/teacherApi';
import LocalImageViewer from '../../components/common/LocalImageViewer/LocalImageViewer';
import DevicePickerModal from '../../components/common/DevicePickerModal/DevicePickerModal';
import { Settings, Upload, Image as ImageIcon, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import styles from './StoragePage.module.css';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function StoragePage() {
    const { user, viewAs } = useAuthStore();
    const effectiveRole = (user?.role === 'Coach' || user?.role === 'Admin') && viewAs ? viewAs.role : user?.role;

    const { data: uploads = [] } = useUploads();
    const { data: usage } = useStorageUsage();
    const createUpload = useCreateUploadUrl();
    const confirmUpload = useConfirmUpload();
    const registerDevice = useRegisterDevice();

    const [tab, setTab] = useState('images');
    const [courseId, setCourseId] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    // Cihaz tanıma: Kullanıcı sayfaya geldiğinde arka planda sessizce kaydedilir (T11 & T14)
    useEffect(() => {
        registerCurrentDevice()
            .then((d) => registerDevice.mutate(d))
            .catch(() => {});
    }, []);

    // Öğrenci için ders listesi ve alıcı seçenekleri
    const { data: studentCourses = [] } = useStudentCourses();
    const { data: recipients = [] } = useRecipients(courseId || null);

    // Koç için öğrenci listesi
    const { data: coachStudents = [] } = useStudents();

    // Öğretmen için ders ve dersin öğrencileri
    const { data: teacherCourses = [] } = useTeacherCourses();
    const { data: teacherStudents = [] } = useTeacherCourseStudents(courseId || null);

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

        setUploading(true);
        try {
            const compressed = await compressImage(file);
            const res = await createUpload.mutateAsync({
                fileName: compressed.name,
                fileSizeInBytes: compressed.size,
                contentType: compressed.type,
                programId: targetProgramId,
                courseId: courseId || undefined,
                recipientUserId: targetRecipientId,
            });
            await axios.put(res.uploadUrl, compressed, { headers: { 'Content-Type': compressed.type } });
            await confirmUpload.mutateAsync(res.uploadId);
            alert('Dosya başarıyla yüklendi.');
        } catch (err) {
            alert('Yükleme başarısız: ' + (err?.response?.data?.error || err?.message || 'bilinmeyen hata'));
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className={styles.heading} style={{ margin: 0 }}>Dosyalarım</h2>
                        <button 
                            type="button" 
                            className={styles.settingsIconBtn} 
                            onClick={() => setPickerOpen(true)}
                            title="İndirme Cihazı Ayarı"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '6px',
                                color: 'var(--text-color-muted, #94A3B8)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Settings size={17} />
                        </button>
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

                    <button 
                        className={styles.btnPrimary} 
                        disabled={uploading} 
                        onClick={() => fileRef.current?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Upload size={15} />
                        <span>{uploading ? 'Yükleniyor…' : 'Dosya Yükle'}</span>
                    </button>
                    <input 
                        ref={fileRef} 
                        type="file" 
                        hidden 
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx" 
                        onChange={handleFile} 
                    />
                </div>
                <p className={styles.disclaimer}>
                    Dosyalar otomatik virüs taramasından geçmez; sorumluluk kullanıcıya aittir. Resimler otomatik olarak WebP formatına sıkıştırılır.
                </p>
            </div>

            <div className={styles.tabs}>
                <button 
                    className={tab === 'images' ? styles.tabActive : styles.tab} 
                    onClick={() => setTab('images')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <ImageIcon size={15} /> Resimler ({uploads.filter((u) => IMAGE_TYPES.includes(u.contentType)).length})
                </button>
                <button 
                    className={tab === 'docs' ? styles.tabActive : styles.tab} 
                    onClick={() => setTab('docs')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <FileText size={15} /> Belgeler ({uploads.filter((u) => DOC_TYPES.includes(u.contentType)).length})
                </button>
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
    const download = useDownloadUrl();

    async function handleOpen() {
        try {
            const res = await download.mutateAsync(upload.id);
            window.open(res.url, '_blank', 'noopener');
        } catch {
            alert('Dosya açılamadı.');
        }
    }

    return (
        <button className={styles.docBtn} onClick={handleOpen}>
            <span className={styles.docIcon} style={{ display: 'inline-flex', alignItems: 'center' }}><FileText size={16} /></span>
            <span className={styles.docName}>{upload.originalName}</span>
            <span className={styles.docAction} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                Aç / İndir <ExternalLink size={12} />
            </span>
        </button>
    );
}
