import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Search, Trash2, Edit2, CheckCircle, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';
import styles from './AdminPanel.module.css';
import { 
  getAllWorkspaces, 
  updateWorkspaceAsAdmin, 
  deleteWorkspaceAsAdmin, 
  restoreWorkspaceAsAdmin 
} from '../../services/adminService';

const WorkspaceManagement = ({ tone }) => {
  const { t } = useTranslation('admin');
  const [workspaces, setWorkspaces] = useState([]);
  const [filteredWorkspaces, setFilteredWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await getAllWorkspaces();
      setWorkspaces(data);
      setFilteredWorkspaces(data);
    } catch (err) {
      console.error(err);
      alert(t('err_fetch_workspaces', { context: tone, defaultValue: 'Alanlar getirilemedi.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWorkspaces(workspaces);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      setFilteredWorkspaces(
        workspaces.filter(w => 
          w.name.toLowerCase().includes(lowerQ) || 
          (w.ownerEmail && w.ownerEmail.toLowerCase().includes(lowerQ))
        )
      );
    }
  }, [searchQuery, workspaces]);

  const handleEditStart = (ws) => {
    setEditingId(ws.id);
    setEditName(ws.name);
    setEditDesc(ws.description || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  };

  const handleEditSave = async (id) => {
    try {
      await updateWorkspaceAsAdmin(id, { name: editName, description: editDesc });
      setEditingId(null);
      fetchWorkspaces();
    } catch (err) {
      alert("Alan güncellenemedi.");
    }
  };

  const handleDelete = async (id, hardDelete) => {
    const msg = hardDelete 
      ? "Bu alanı KALICI OLARAK silmek istediğinize emin misiniz? (Tüm görevler, üyeler, her şey silinecek!)"
      : "Bu alanı pasife çekmek (Yumuşak Silme) istediğinize emin misiniz?";
    
    if (!window.confirm(msg)) return;

    try {
      await deleteWorkspaceAsAdmin(id, hardDelete);
      fetchWorkspaces();
    } catch (err) {
      alert("Silme işlemi başarısız.");
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("Bu alanı tekrar aktifleştirmek istediğinize emin misiniz?")) return;
    try {
      await restoreWorkspaceAsAdmin(id);
      fetchWorkspaces();
    } catch (err) {
      alert("Aktifleştirme başarısız.");
    }
  };

  return (
    <div className={styles.container} style={{ padding: '0', background: 'transparent' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Alan adı veya Kurucu Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>
        <button 
          onClick={fetchWorkspaces}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <RefreshCw size={16} className={loading ? styles.spinner : ''} />
          Yenile
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <RefreshCw className={styles.spinner} size={24} />
          <p>Yükleniyor...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>Ad / Açıklama</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>Kurucu</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>Davet Kodu</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>Durum</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkspaces.map(ws => (
                <tr key={ws.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: ws.isActive ? 1 : 0.6 }}>
                  
                  {/* ALAN BİLGİLERİ (DÜZENLEME MODU) */}
                  <td style={{ padding: '12px 16px' }}>
                    {editingId === ws.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                        <input 
                          type="text" 
                          value={editDesc} 
                          onChange={(e) => setEditDesc(e.target.value)} 
                          placeholder="Açıklama (opsiyonel)"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{ws.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ws.description || '-'}</div>
                      </div>
                    )}
                  </td>

                  {/* KURUCU */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '500' }}>{ws.ownerName || 'Bilinmiyor'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ws.ownerEmail || '-'}</div>
                  </td>

                  {/* DAVET KODU */}
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{ws.inviteCode}</code>
                  </td>

                  {/* DURUM */}
                  <td style={{ padding: '12px 16px' }}>
                    {ws.isActive ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        Aktif
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        Silinmiş
                      </span>
                    )}
                  </td>

                  {/* İŞLEMLER */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {editingId === ws.id ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => handleEditSave(ws.id)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Kaydet</button>
                        <button onClick={handleEditCancel} style={{ padding: '6px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>İptal</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {ws.isActive ? (
                          <>
                            <button onClick={() => handleEditStart(ws)} title="Düzenle" style={{ padding: '6px', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(ws.id, false)} title="Yumuşak Sil (Pasife Al)" style={{ padding: '6px', background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <AlertCircle size={16} />
                            </button>
                            <button onClick={() => handleDelete(ws.id, true)} title="Kalıcı Olarak Sil (Hard Delete)" style={{ padding: '6px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleRestore(ws.id)} title="Geri Getir (Aktifleştir)" style={{ padding: '6px', background: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <RotateCcw size={16} />
                            </button>
                            <button onClick={() => handleDelete(ws.id, true)} title="Kalıcı Olarak Sil (Hard Delete)" style={{ padding: '6px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredWorkspaces.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Eşleşen çalışma alanı bulunamadı.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default WorkspaceManagement;
