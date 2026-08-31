import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '../../services/apiClient';
import styles from './SystemLogs.module.css';

const SystemLogs = ({ tone }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/admin/system-errors');
      setLogs(res.data);
    } catch (err) {
      console.error('System Logs fetch error:', err);
      setError('Loglar alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={24} />
        <p>Loglar yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={24} />
        <p>{error}</p>
        <button onClick={fetchLogs} className={styles.retryBtn}>Tekrar Dene</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Sistem Hata Logları</h2>
        <button onClick={fetchLogs} className={styles.refreshBtn}>
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.logTable}>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Endpoint / Yöntem</th>
              <th>Hata Mesajı</th>
              <th>Kullanıcı ID</th>
              <th>Detay</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Kayıtlı sistem hatası bulunamadı.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className={expandedRow === log.id ? styles.expandedRow : ''} onClick={() => toggleRow(log.id)}>
                    <td className={styles.dateCell}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={styles.methodBadge}>{log.httpMethod}</span>
                      <span className={styles.pathText}>{log.path}</span>
                    </td>
                    <td className={styles.errorMsgCell}>{log.errorMessage}</td>
                    <td className={styles.userCell}>{log.userId || 'Anonim'}</td>
                    <td>
                      <button className={styles.expandBtn}>
                        {expandedRow === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr className={styles.detailRow}>
                      <td colSpan="5">
                        <div className={styles.stackTrace}>
                          <strong>Stack Trace:</strong>
                          <pre>{log.stackTrace}</pre>
                        </div>
                        {log.tenantId && (
                          <div className={styles.tenantInfo}>
                            <strong>Tenant ID:</strong> {log.tenantId}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLogs;
