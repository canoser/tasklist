import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePrograms, useProgramAuditLogs } from '../coachSchoolApi';
import Card from '../../../components/common/Card/Card';
import { formatDate } from '../../../utils/dateUtils';
import styles from './CoachAuditLogsPage.module.css';

const ACTION_COLORS = {
  HOMEWORK_ASSIGNED: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Ödev Atandı' },
  HOMEWORK_COMPLETED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Ödev Tamamlandı' },
  HOMEWORK_REVIEWED: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Ödev Onaylandı' },
  EXAM_CREATED: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Sınav Girildi' },
  SCHEDULE_CREATED: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', label: 'Ders Planlandı' },
  SCHEDULE_UPDATED: { bg: 'rgba(234, 88, 12, 0.15)', text: '#ea580c', label: 'Plan Güncellendi' },
  COACH_ROLE_TRANSFERRED: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', label: 'Yöneticilik Devredildi' },
  SECURITY_ALERT: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Güvenlik Uyarısı' },
};

const CoachAuditLogsPage = () => {
  const { programId: routeProgramId } = useParams();
  const { data: programs = [], isLoading: programsLoading } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState(routeProgramId || '');
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Eğer route'dan gelmediyse ve henüz seçim yapılmadıysa ilk programı seç
  const activeProgramId = selectedProgramId || (programs[0]?.id ?? '');

  const { data: logs = [], isLoading: logsLoading } = useProgramAuditLogs(activeProgramId, 200);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchPerformer = log.performerName?.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchTarget = log.targetType?.toLowerCase().includes(q);
      const matchDetails = log.detailsJson?.toLowerCase().includes(q);
      if (!matchPerformer && !matchAction && !matchTarget && !matchDetails) return false;
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Program Denetim İzi (Audit Logs)</h1>
          <p className={styles.subtitle}>
            Kritik işlemler, ödev/sınav hareketleri ve program içi değişikliklerin kayıtları.
          </p>
        </div>

        {programs.length > 1 && (
          <div className={styles.programSelector}>
            <label htmlFor="program-select">Program:</label>
            <select
              id="program-select"
              value={activeProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className={styles.select}
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="İşlem, kişi veya ayrıntı ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className={styles.select}
        >
          <option value="ALL">Tüm İşlemler ({logs.length})</option>
          {uniqueActions.map((act) => {
            const conf = ACTION_COLORS[act];
            return (
              <option key={act} value={act}>
                {conf ? conf.label : act}
              </option>
            );
          })}
        </select>
      </div>

      <Card className={styles.tableCard} padding="none">
        {logsLoading || programsLoading ? (
          <div className={styles.loading}>Kayıtlar yükleniyor...</div>
        ) : filteredLogs.length === 0 ? (
          <div className={styles.empty}>Denetim izi kaydı bulunamadı.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlemi Yapan</th>
                  <th>İşlem</th>
                  <th>Hedef</th>
                  <th>Detaylar</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const conf = ACTION_COLORS[log.action] || {
                    bg: 'rgba(100, 116, 139, 0.15)',
                    text: '#64748b',
                    label: log.action,
                  };
                  return (
                    <tr key={log.id}>
                      <td className={styles.dateCol}>
                        {formatDate(log.createdAt, 'dd MMM yyyy, HH:mm:ss')}
                      </td>
                      <td>
                        <strong>{log.performerName || 'Bilinmiyor'}</strong>
                        {log.performerRole && (
                          <span className={styles.roleTag}>({log.performerRole})</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{ backgroundColor: conf.bg, color: conf.text }}
                        >
                          {conf.label}
                        </span>
                      </td>
                      <td>
                        <span className={styles.targetType}>{log.targetType || '-'}</span>
                      </td>
                      <td className={styles.detailsCol}>
                        <code>{log.detailsJson || '-'}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CoachAuditLogsPage;
