import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SharedLinksPanel.module.css';
import { getMySharedLinks, createSharedLink } from '../../services/coachingApi';

export default function SharedLinksPanel({ tone }) {
  const { t } = useTranslation('coaching');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newLink, setNewLink] = useState({
    studentProfileId: '',
    role: 'Parent',
    expiresAt: ''
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const data = await getMySharedLinks();
      setLinks(data);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewLink({ ...newLink, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentProfileId: parseInt(newLink.studentProfileId) || null,
        role: newLink.role,
        expiresAt: newLink.expiresAt ? new Date(newLink.expiresAt).toISOString() : null
      };
      
      const savedLink = await createSharedLink(payload);
      setLinks([savedLink, ...links]);
      setNewLink({
        studentProfileId: '',
        role: 'Parent',
        expiresAt: ''
      });
      alert('Link başarıyla oluşturuldu.');
    } catch (error) {
      console.error('Save link error:', error);
      alert('Link oluşturulamadı.');
    }
  };

  if (loading) return <div className={styles.loading}>Linkler yükleniyor...</div>;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Paylaşım Linkleri (Veli / Öğretmen)</h3>
      
      <form className={styles.form} onSubmit={handleSave}>
        <h4>Yeni Link Oluştur</h4>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Öğrenci ID (Zorunlu Değil)</label>
            <input type="number" name="studentProfileId" value={newLink.studentProfileId} onChange={handleInputChange} placeholder="Tüm öğrenciler için boş bırakın" />
          </div>
          <div className={styles.formGroup}>
            <label>Rol / Erişim Seviyesi</label>
            <select name="role" value={newLink.role} onChange={handleInputChange}>
              <option value="Parent">Veli (Okuma)</option>
              <option value="Teacher">Öğretmen (Kısmi Erişim)</option>
              <option value="Guest">Misafir</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Son Kullanma Tarihi</label>
            <input type="datetime-local" name="expiresAt" value={newLink.expiresAt} onChange={handleInputChange} />
          </div>
        </div>
        
        <button type="submit" className={styles.submitBtn}>Oluştur</button>
      </form>
      
      <div className={styles.listSection}>
        <h4>Aktif Linkler</h4>
        {links.length === 0 ? (
          <p className={styles.emptyText}>Henüz oluşturulmuş bir link bulunmuyor.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Oluşturulma</th>
                <th>Rol</th>
                <th>Öğrenci ID</th>
                <th>Erişim Token</th>
                <th>PIN (Opsiyonel)</th>
                <th>Son Kullanma</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id}>
                  <td>{new Date(link.createdAt).toLocaleDateString()}</td>
                  <td>{link.role}</td>
                  <td>{link.studentProfileId || 'Tümü'}</td>
                  <td><code className={styles.token}>{link.accessToken}</code></td>
                  <td>{link.requiresPin ? 'Evet' : 'Hayır'}</td>
                  <td>{link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Süresiz'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
