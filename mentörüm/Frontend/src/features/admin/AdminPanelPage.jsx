import React, { useState } from 'react';
import { usePendingApprovals, useAdminUsers, useApproveUser, useRejectUser, useAddUser, useChangeUserPassword, useRateLimits, useUpdateRateLimit } from '../coach/coachSchoolApi';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Card from '../../components/common/Card/Card';
import Modal from '../../components/common/Modal/Modal';
import SegmentedTabs from '../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge';
import styles from './AdminPanelPage.module.css';
import { apiClient } from '../../api/apiClient';

const CURRICULUM_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'TYT', 'AYT'];

const ROLE_LABEL = { 
  Student: 'Öğrenci', 
  Parent: 'Veli', 
  Coach: 'Koç',
  Teacher: 'Öğretmen',
  Admin: 'Yönetici'
};

const AdminPanelPage = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pending, isLoading: isPendingLoading } = usePendingApprovals();
  const { data: allUsers, isLoading: isAllUsersLoading } = useAdminUsers(roleFilter, searchTerm);
  
  const approve = useApproveUser();
  const reject = useRejectUser();
  const addUser = useAddUser();
  const changePassword = useChangeUserPassword();
  const [pwUser, setPwUser] = useState(null);
  const [pwValue, setPwValue] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const { data: rateLimits } = useRateLimits();
  const updateRateLimit = useUpdateRateLimit();
  const [rlValues, setRlValues] = useState({});
  const [rlMsg, setRlMsg] = useState('');

  const handleChangePassword = async (userId) => {
    if (pwValue.trim().length < 6) {
      setPwMsg('Şifre en az 6 karakter olmalı.');
      return;
    }
    setPwMsg('');
    try {
      await changePassword.mutateAsync({ userId, newPassword: pwValue.trim() });
      setPwMsg('Şifre güncellendi.');
      setPwUser(null);
      setPwValue('');
    } catch (e) {
      setPwMsg(e?.response?.data?.error || 'Şifre güncellenemedi.');
    }
  };

  const [roles, setRoles] = useState({});
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Coach');
  const [created, setCreated] = useState(null);
  const [addError, setAddError] = useState('');
  const [curriculumBusy, setCurriculumBusy] = useState(false);
  const [curriculumResult, setCurriculumResult] = useState(null);
  const [curriculumError, setCurriculumError] = useState('');
  const [curriculumGrade, setCurriculumGrade] = useState('');
  const [quotaModalUser, setQuotaModalUser] = useState(null);
  const [maxStudentsInput, setMaxStudentsInput] = useState('');
  const [maxTeachersInput, setMaxTeachersInput] = useState('');
  const [storageQuotaInput, setStorageQuotaInput] = useState('');

  const handleApprove = (userId, defaultRole) => {
    const role = roles[userId] || defaultRole;
    if (role === 'Coach') {
      setQuotaModalUser({ userId, role });
      setMaxStudentsInput('');
      setMaxTeachersInput('');
      setStorageQuotaInput('');
    } else {
      approve.mutateAsync({ userId, role });
    }
  };

  const handleConfirmCoachApprove = async (e) => {
    e.preventDefault();
    if (!quotaModalUser) return;
    await approve.mutateAsync({
      userId: quotaModalUser.userId,
      role: quotaModalUser.role,
      maxStudents: maxStudentsInput ? parseInt(maxStudentsInput, 10) : null,
      maxTeachers: maxTeachersInput ? parseInt(maxTeachersInput, 10) : null,
      storageQuotaMb: storageQuotaInput ? parseInt(storageQuotaInput, 10) : null,
    });
    setQuotaModalUser(null);
  };

  const handleAddUser = async () => {
    setAddError('');
    setCreated(null);
    if (!newEmail || !newFullName) { setAddError('Ad Soyad ve e-posta zorunludur.'); return; }
    try {
      const res = await addUser.mutateAsync({ email: newEmail, fullName: newFullName, role: newRole });
      setCreated(res);
      setNewEmail(''); setNewFullName('');
    } catch (err) {
      setAddError(err?.response?.data?.error || 'Kullanıcı eklenemedi.');
    }
  };

  const handleExportCurriculum = async () => {
    setCurriculumError('');
    setCurriculumResult(null);
    setCurriculumBusy(true);
    try {
      const qs = curriculumGrade ? `?grade=${encodeURIComponent(curriculumGrade)}` : '';
      const data = await apiClient.get(`/curriculum/export${qs}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = curriculumGrade ? `mufredat_${curriculumGrade}.json` : 'mufredat_sablonu.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setCurriculumError('Dışa aktarma başarısız: ' + (e?.response?.data?.error || e?.message || 'Bilinmeyen hata'));
    } finally {
      setCurriculumBusy(false);
    }
  };

  const handleImportCurriculum = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCurriculumBusy(true);
    setCurriculumError('');
    setCurriculumResult(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const qs = curriculumGrade ? `?grade=${encodeURIComponent(curriculumGrade)}` : '';
      const res = await apiClient.post(`/curriculum/import${qs}`, payload);
      setCurriculumResult(res);
    } catch (err) {
      setCurriculumError('İçe aktarma başarısız: ' + (err?.response?.data?.error || err?.message || 'JSON biçimi geçersiz olabilir'));
    } finally {
      setCurriculumBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Sistem Yönetim Paneli</h1>
          <p className={styles.subtitle}>Tüm kullanıcıları, bağımsız öğrencileri ve onay bekleyen başvuruları yönetin.</p>
        </div>
      </header>

      {/* Navigasyon Sekmeleri */}
      <SegmentedTabs
        tabs={[
          { id: 'pending', label: '⏳ Onay Bekleyenler', count: pending?.length || 0 },
          { id: 'all', label: '👥 Tüm Kullanıcılar', count: allUsers?.length },
          { id: 'curriculum', label: '📚 Müfredat' },
          { id: 'security', label: '🛡️ Güvenlik & Kota' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: '20px' }}
      />

      {/* SEKME 1: ONAY BEKLEYENLER */}
      {activeTab === 'pending' && (
        <div className={styles.section}>
          <Card className={styles.addCard} padding="md">
            <h3 className={styles.cardSectionTitle}>Manuel Kullanıcı Ekle</h3>
            <div className={styles.formGrid}>
              <Input label="Ad Soyad" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
              <Input label="E-posta" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ornek@email.com" />
              <div>
                <label className={styles.selectLabel}>Rol Seçin</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={styles.select}>
                  <option value="Coach">Koç</option>
                  <option value="Student">Öğrenci</option>
                  <option value="Parent">Veli</option>
                </select>
              </div>
            </div>
            <Button size="sm" onClick={handleAddUser} style={{ marginTop: '12px' }}>Kullanıcıyı Kaydet</Button>
            {addError && <p className={styles.error}>{addError}</p>}
            {created && (
              <div className={styles.createdInfo}>
                <p>✅ Kullanıcı eklendi. Geçici şifre: <strong>{created.password}</strong></p>
                <p>E-posta: {created.email} (Bu şifreyi kullanıcıya iletin)</p>
              </div>
            )}
          </Card>

          <div className={styles.list}>
            <h3 className={styles.listTitle}>Onay Bekleyen Kayıtlar</h3>
            {isPendingLoading && <p>Yükleniyor...</p>}
            {!isPendingLoading && pending?.length === 0 && (
              <div className={styles.emptyState}>
                <span>✓</span>
                <p>Şu anda onay bekleyen kullanıcı bulunmuyor.</p>
              </div>
            )}
            {pending?.map((u) => (
              <Card key={u.id} className={styles.item} padding="md">
                <div className={styles.itemHeader}>
                  <div>
                    <strong className={styles.userName}>{u.fullName}</strong>
                    <div className={styles.email}>{u.email}</div>
                  </div>
                  <span className={styles.badgePending}>Onay Bekliyor</span>
                </div>
                <div className={styles.roleRow}>
                  <span className={styles.roleSelectLabel}>Onaylanacak Rol:</span>
                  {['Student', 'Parent', 'Coach'].map((r) => (
                    <label key={r} className={styles.roleRadio}>
                      <input
                        type="radio"
                        name={`role-${u.id}`}
                        value={r}
                        checked={(roles[u.id] || u.role) === r}
                        onChange={() => setRoles({ ...roles, [u.id]: r })}
                      />
                      {ROLE_LABEL[r]}
                    </label>
                  ))}
                </div>
                <div className={styles.actions}>
                  <Button size="sm" onClick={() => handleApprove(u.id, u.role)} isLoading={approve.isPending}>
                    ✓ Onayla
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject.mutateAsync({ userId: u.id })} isLoading={reject.isPending}>
                    ✕ Reddet
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SEKME 2: TÜM SİSTEM KULLANICILARI */}
      {activeTab === 'all' && (
        <div className={styles.section}>
          <Card className={styles.filterCard} padding="md">
            <div className={styles.allFilterGrid}>
              <Input 
                placeholder="İsim veya e-posta ile kullanıcı ara..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)} 
                className={styles.select}
              >
                <option value="">Tüm Roller</option>
                <option value="Student">Öğrenci</option>
                <option value="Coach">Koç</option>
                <option value="Parent">Veli</option>
                <option value="Teacher">Öğretmen</option>
                <option value="Admin">Yönetici</option>
              </select>
            </div>
          </Card>

          <div className={styles.list}>
            {isAllUsersLoading && <p>Kullanıcılar yükleniyor...</p>}
            {!isAllUsersLoading && allUsers?.length === 0 && (
              <div className={styles.emptyState}>
                <p>Arama kriterine uygun kullanıcı bulunamadı.</p>
              </div>
            )}
            {allUsers?.map((u) => (
              <Card key={u.id} className={styles.allUserCard} padding="md">
                <div className={styles.userMainInfo}>
                  <div className={styles.avatarCircle}>
                    {u.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className={styles.allUserNameRow}>
                      <strong className={styles.allUserName}>{u.fullName}</strong>
                      <span className={`${styles.roleBadge} ${styles['role_' + u.role]}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                      <StatusBadge
                        status={u.approvalStatus}
                        label={u.approvalStatus === 'APPROVED' ? 'Aktif' : u.approvalStatus}
                        size="sm"
                      />
                    </div>
                    <div className={styles.allUserEmail}>{u.email}</div>
                    <div className={styles.programInfo}>
                      {u.role === 'Student' && (
                        <span>
                          🏫 Program: <strong>{u.programName || 'Bireysel / Bağımsız'}</strong>
                        </span>
                      )}
                      <span className={styles.createdDate}>
                        Kayıt: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Button size="sm" variant="outline" onClick={() => { setPwUser(pwUser === u.id ? null : u.id); setPwValue(''); setPwMsg(''); }}>
                        {pwUser === u.id ? 'Vazgeç' : '🔑 Şifre Değiştir'}
                      </Button>
                      {pwUser === u.id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <input
                            type="password"
                            placeholder="Yeni şifre (en az 6)"
                            value={pwValue}
                            onChange={(e) => setPwValue(e.target.value)}
                            autoComplete="new-password"
                            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', minWidth: 180 }}
                          />
                          <Button size="sm" onClick={() => handleChangePassword(u.id)} isLoading={changePassword.isPending && pwUser === u.id}>Kaydet</Button>
                          {pwMsg && <span style={{ fontSize: 12, color: '#666' }}>{pwMsg}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* SEKME 3: MÜFREDAT YÖNETİMİ */}
      {activeTab === 'curriculum' && (
        <div className={styles.section}>
          <Card padding="md">
            <h3 className={styles.cardSectionTitle}>📚 Müfredat Yönetimi</h3>
            <p style={{ color: '#555', marginBottom: 12 }}>
              Her sınıfın müfredatını ayrı ayrı yönetin. Üstten bir sınıf/seviye seçip yalnızca o sınıfın JSON şablonunu indirin;
              şablonu bir yapay zekâya yapıştırıp gerçek MEB müfredatıyla doldurun, ardından doldurulmuş dosyayı aynı sınıf için içe aktarın.
              (Sınıf seçmezseniz tüm müfredat tek dosyada işlenir.)
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }}>
                Sınıf / Seviye
                <select
                  value={curriculumGrade}
                  onChange={(e) => setCurriculumGrade(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #ccc', minWidth: 120 }}
                >
                  <option value="">-- Tümü --</option>
                  {CURRICULUM_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button onClick={handleExportCurriculum} disabled={curriculumBusy}>📥 Şablonu İndir (JSON)</Button>
              <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportCurriculum}
                  disabled={curriculumBusy}
                  style={{ display: 'none' }}
                />
                <span style={{ display: 'inline-block', cursor: 'pointer', border: '1px solid #ccc', padding: '8px 14px', borderRadius: 8, background: '#f5f5f5' }}>
                  {curriculumBusy ? 'İçe aktarılıyor…' : '📤 İçe Aktar (JSON)'}
                </span>
              </label>
            </div>
            {curriculumResult && (
              <div style={{ marginTop: 12, padding: 10, background: '#eef7ee', borderRadius: 8 }}>
                <strong>Sonuç:</strong> {curriculumResult.inserted} eklendi, {curriculumResult.updated} güncellendi, {curriculumResult.skipped} atlandı.
                {curriculumResult.errors?.length > 0 && (
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 12 }}>{curriculumResult.errors.join('\n')}</pre>
                )}
              </div>
            )}
            {curriculumError && <p style={{ color: '#c00', marginTop: 10 }}>{curriculumError}</p>}
          </Card>
        </div>
      )}

      {/* SEKME 4: GÜVENLİK & KOTA */}
      {activeTab === 'security' && (
        <div className={styles.section}>
          <Card padding="md">
            <h3 className={styles.cardSectionTitle}>🛡️ Güvenlik & Kota Denetimi</h3>
            <p style={{ color: '#555', marginBottom: 12 }}>
              Hız limiti kurallarını düzenleyin. Değişiklik 30 saniye içinde geçerli olur.
            </p>

            <h4 style={{ margin: '12px 0 8px' }}>Hız Limiti Kuralları</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '6px 8px' }}>Endpoint</th>
                  <th style={{ padding: '6px 8px' }}>Limit (5 dk)</th>
                  <th style={{ padding: '6px 8px' }}>Son Güncelleme</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {(rateLimits?.rules || []).map((r) => (
                  <tr key={r.path} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{r.path}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={rlValues[r.path] ?? r.maxAttempts}
                        onChange={(e) => setRlValues((prev) => ({ ...prev, [r.path]: e.target.value }))}
                        style={{ width: 80, padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', color: '#777' }}>{r.updatedAt ? new Date(r.updatedAt).toLocaleString('tr-TR') : '-'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateRateLimit.mutateAsync({ path: r.path, maxAttempts: parseInt(rlValues[r.path] ?? r.maxAttempts, 10) });
                            setRlMsg('Kural güncellendi.');
                          } catch {
                            setRlMsg('Güncellenemedi.');
                          }
                        }}
                      >
                        Güncelle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rlMsg && <p style={{ marginTop: 8, fontSize: 13, color: rlMsg.startsWith('Kural') ? '#16a34a' : '#c00' }}>{rlMsg}</p>}

            <h4 style={{ margin: '20px 0 8px' }}>Son Kota İhlalleri (429)</h4>
            {rateLimits?.events?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '6px 8px' }}>Endpoint</th>
                    <th style={{ padding: '6px 8px' }}>IP</th>
                    <th style={{ padding: '6px 8px' }}>Deneme</th>
                    <th style={{ padding: '6px 8px' }}>Zaman</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.events.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{e.path}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{e.ip}</td>
                      <td style={{ padding: '6px 8px' }}>{e.attempts}</td>
                      <td style={{ padding: '6px 8px', color: '#777' }}>{new Date(e.createdAt).toLocaleString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#777', fontSize: 13 }}>Henüz kota ihlali kaydedilmedi.</p>
            )}
          </Card>
        </div>
      )}

      <Modal
        isOpen={!!quotaModalUser}
        onClose={() => setQuotaModalUser(null)}
        title="Koç Hesabı Kota ve Limit Ayarları"
        maxWidth="440px"
      >
        <form onSubmit={handleConfirmCoachApprove} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-muted)' }}>
            Alanları boş bırakırsanız varsayılan sistem limitleri uygulanır.
          </p>
          <Input
            label="Maksimum Öğrenci Limiti"
            type="number"
            placeholder="Varsayılan"
            value={maxStudentsInput}
            onChange={(e) => setMaxStudentsInput(e.target.value)}
          />
          <Input
            label="Maksimum Öğretmen Limiti"
            type="number"
            placeholder="Varsayılan"
            value={maxTeachersInput}
            onChange={(e) => setMaxTeachersInput(e.target.value)}
          />
          <Input
            label="Depolama Kotası (MB)"
            type="number"
            placeholder="Varsayılan"
            value={storageQuotaInput}
            onChange={(e) => setStorageQuotaInput(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuotaModalUser(null)}>
              İptal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={approve.isPending}>
              Onayla ve Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPanelPage;
