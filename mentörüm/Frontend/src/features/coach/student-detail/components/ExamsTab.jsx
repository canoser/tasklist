import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import Input from '../../../../components/common/Input/Input';
import { useAddExamResult, useSubjects, useTopics } from '../../coachApi';
import { Trash2, Plus } from 'lucide-react';
import styles from '../CoachStudentDetail.module.css';

const ExamScoreRow = ({ row, index, grade, subjects, examType, studentTrack, onChange, onRemove }) => {
  const { data: topics = [] } = useTopics(row.subjectId, grade ? String(grade) : undefined);

  const calculateRowNet = (correct, wrong) => {
    if (examType === 'Okul' || examType === 'Diğer') return correct != null ? Number(correct) : null;
    const divisor = examType === 'LGS' || studentTrack === 'ORTAOKUL' ? 3 : 4;
    if (correct == null && wrong == null) return null;
    const c = Number(correct || 0);
    const w = Number(wrong || 0);
    return Math.round((c - w / divisor) * 100) / 100;
  };

  const isOkul = examType === 'Okul' || examType === 'Diğer';
  const currentNet = calculateRowNet(row.correct, row.wrong);
  const sumMismatch =
    row.questionCount !== '' &&
    row.questionCount != null &&
    Number(row.correct || 0) + Number(row.wrong || 0) + Number(row.blank || 0) !== Number(row.questionCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '130px' }}>
          <select
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            value={row.subjectId || ''}
            onChange={(e) => onChange(index, { subjectId: e.target.value, curriculumTopicId: '' })}
          >
            <option value="">-- Ders Seçin --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: '150px' }}>
          <select
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            value={row.curriculumTopicId || ''}
            disabled={!row.subjectId}
            onChange={(e) => onChange(index, { curriculumTopicId: e.target.value })}
          >
            <option value="">-- Konu (Opsiyonel) --</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.unitName ? `[${t.unitName}] ` : ''}
                {t.topicName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
          title="Satırı Kaldır"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {isOkul ? (
          <>
            <div style={{ width: '90px' }}>
              <Input
                placeholder="Puan"
                type="number"
                value={row.score || ''}
                onChange={(e) => onChange(index, { score: e.target.value })}
              />
            </div>
            <div style={{ width: '90px' }}>
              <Input
                placeholder="Maks"
                type="number"
                value={row.maxScore || ''}
                onChange={(e) => onChange(index, { maxScore: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ width: '75px' }}>
              <Input
                placeholder="Soru"
                type="number"
                value={row.questionCount || ''}
                onChange={(e) => onChange(index, { questionCount: e.target.value })}
              />
            </div>
            <div style={{ width: '70px' }}>
              <Input
                placeholder="D"
                type="number"
                value={row.correct || ''}
                onChange={(e) => onChange(index, { correct: e.target.value })}
              />
            </div>
            <div style={{ width: '70px' }}>
              <Input
                placeholder="Y"
                type="number"
                value={row.wrong || ''}
                onChange={(e) => onChange(index, { wrong: e.target.value })}
              />
            </div>
            <div style={{ width: '70px' }}>
              <Input
                placeholder="B"
                type="number"
                value={row.blank || ''}
                onChange={(e) => onChange(index, { blank: e.target.value })}
              />
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              Net: {currentNet != null ? currentNet : '-'}
            </div>
          </>
        )}
      </div>
      {sumMismatch && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
          ⚠ Doğru ({row.correct || 0}) + Yanlış ({row.wrong || 0}) + Boş ({row.blank || 0}) ≠ Soru Sayısı ({row.questionCount})
        </span>
      )}
    </div>
  );
};

export default function ExamsTab({ studentId, student }) {
  const [examEntryMode, setExamEntryMode] = useState('quick');
  const [examType, setExamType] = useState('Deneme');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [quickTotalNet, setQuickTotalNet] = useState('');
  const [detailedRows, setDetailedRows] = useState([]);

  const defaultLevel = student?.grade ? String(student.grade) : student?.track === 'ORTAOKUL' ? '8' : '12';
  const { data: subjects = [] } = useSubjects(defaultLevel);
  const addExamMutation = useAddExamResult();

  const addDetailedRow = () => {
    setDetailedRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        subjectId: subjects[0]?.id || '',
        curriculumTopicId: '',
        questionCount: '',
        correct: '',
        wrong: '',
        blank: '',
        score: '',
        maxScore: '',
      },
    ]);
  };

  const updateDetailedRow = (idx, patch) => {
    setDetailedRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const removeDetailedRow = (idx) => {
    setDetailedRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const computeDetailedTotalNet = () => {
    if (examType === 'Okul' || examType === 'Diğer') return null;
    const divisor = examType === 'LGS' || student?.track === 'ORTAOKUL' ? 3 : 4;
    let total = 0;
    let hasValid = false;
    for (const r of detailedRows) {
      if (r.correct != null && r.correct !== '') {
        const c = Number(r.correct || 0);
        const w = Number(r.wrong || 0);
        total += c - w / divisor;
        hasValid = true;
      }
    }
    return hasValid ? Math.round(total * 100) / 100 : 0;
  };

  const handleSaveExam = () => {
    if (!examName.trim()) {
      alert('Lütfen sınav adını girin.');
      return;
    }

    if (examEntryMode === 'quick') {
      const netVal = parseFloat(quickTotalNet);
      if (isNaN(netVal) && examType !== 'Okul') {
        alert('Lütfen geçerli bir toplam net girin.');
        return;
      }
      addExamMutation.mutate(
        {
          studentId,
          examData: {
            examName: examName.trim(),
            examDate: examDate || new Date().toISOString().split('T')[0],
            examType,
            totalNet: isNaN(netVal) ? 0 : netVal,
            scores: [],
          },
        },
        {
          onSuccess: () => {
            setExamName('');
            setExamDate('');
            setQuickTotalNet('');
          },
        }
      );
    } else {
      if (detailedRows.length === 0) {
        alert('Lütfen en az bir ders/konu satırı ekleyin.');
        return;
      }

      for (let i = 0; i < detailedRows.length; i++) {
        const r = detailedRows[i];
        if (!r.subjectId) {
          alert(`${i + 1}. satır için lütfen ders seçin.`);
          return;
        }
        if (r.questionCount !== '' && r.questionCount != null) {
          const q = parseInt(r.questionCount, 10);
          const c = parseInt(r.correct || 0, 10);
          const w = parseInt(r.wrong || 0, 10);
          const b = parseInt(r.blank || 0, 10);
          if (c + w + b !== q) {
            alert(`${i + 1}. satırda soru sayısı (${q}), Doğru + Yanlış + Boş (${c + w + b}) toplamına eşit olmalıdır.`);
            return;
          }
        }
      }

      const scoresPayload = detailedRows.map((r) => ({
        subjectId: r.subjectId || null,
        curriculumTopicId: r.curriculumTopicId || null,
        questionCount: r.questionCount !== '' && r.questionCount != null ? parseInt(r.questionCount, 10) : null,
        correct: r.correct !== '' && r.correct != null ? parseInt(r.correct, 10) : null,
        wrong: r.wrong !== '' && r.wrong != null ? parseInt(r.wrong, 10) : null,
        blank: r.blank !== '' && r.blank != null ? parseInt(r.blank, 10) : null,
        score: r.score !== '' && r.score != null ? parseFloat(r.score) : null,
        maxScore: r.maxScore !== '' && r.maxScore != null ? parseFloat(r.maxScore) : null,
      }));

      addExamMutation.mutate(
        {
          studentId,
          examData: {
            examName: examName.trim(),
            examDate: examDate || new Date().toISOString().split('T')[0],
            examType,
            scores: scoresPayload,
          },
        },
        {
          onSuccess: () => {
            setExamName('');
            setExamDate('');
            setDetailedRows([]);
          },
        }
      );
    }
  };

  return (
    <Card title="Sınavlar & Net Takibi" className={styles.notesCard}>
      <div className={styles.grid}>
        {student.examResults?.length > 0 ? (
          student.examResults.map((exam) => (
            <Card key={exam.id} title={`${exam.examName || exam.examType}`}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tür:</span>
                <span className={styles.infoValue}>{exam.examType || 'Deneme'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tarih:</span>
                <span className={styles.infoValue}>{exam.examDate ? new Date(exam.examDate).toLocaleDateString('tr-TR') : '-'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Toplam Net:</span>
                <span className={styles.infoValue} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  {exam.totalNet != null ? exam.totalNet : '-'}
                </span>
              </div>
              {exam.scores && exam.scores.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-color-muted)' }}>Ders / Konu Dağılımı:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {exam.scores.map((sc, sIdx) => (
                      <div key={sc.id || sIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#f8fafc', borderRadius: 6 }}>
                        <div>
                          <strong>{sc.subjectName || sc.subjectCode || 'Ders'}</strong>
                          {sc.topicName && <span style={{ color: 'var(--text-color-muted)', marginLeft: 6 }}>({sc.topicName})</span>}
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {sc.questionCount != null ? (
                            <span>
                              {sc.correct ?? 0}D {sc.wrong ?? 0}Y {sc.blank ?? 0}B · <strong>{sc.net ?? 0} Net</strong>
                            </span>
                          ) : sc.score != null ? (
                            <span>
                              {sc.score} / {sc.maxScore ?? 100} Puan
                            </span>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        ) : (
          <p>Henüz sınav sonucu eklenmemiş.</p>
        )}
      </div>

      <div style={{ margin: '24px 0', borderTop: '1px solid #e2e8f0' }} />

      <h4>Yeni Sınav Ekle</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#e2e8f0', padding: 2, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setExamEntryMode('quick')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: examEntryMode === 'quick' ? '#ffffff' : 'transparent',
                fontWeight: examEntryMode === 'quick' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Hızlı Toplam Net
            </button>
            <button
              type="button"
              onClick={() => setExamEntryMode('detailed')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: examEntryMode === 'detailed' ? '#ffffff' : 'transparent',
                fontWeight: examEntryMode === 'detailed' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Detaylı Giriş (Ders / Konu)
            </button>
          </div>

          <div style={{ minWidth: '130px' }}>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="Deneme">Deneme</option>
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
              <option value="LGS">LGS</option>
              <option value="Okul">Okul / Yazılı</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '180px' }}>
            <Input
              label="Sınav Adı"
              placeholder="Örn: TYT Kurumsal Deneme 1"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <Input
              label="Tarih"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>

          {examEntryMode === 'quick' && (
            <div style={{ width: '130px' }}>
              <Input
                label="Toplam Net"
                type="number"
                step="0.25"
                placeholder="0"
                value={quickTotalNet}
                onChange={(e) => setQuickTotalNet(e.target.value)}
              />
            </div>
          )}
        </div>

        {examEntryMode === 'detailed' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>
                Ders / Konu Satırları ({detailedRows.length})
              </span>
              <Button variant="outline" size="sm" onClick={addDetailedRow}>
                <Plus size={14} />
                <span>Ders/Konu Ekle</span>
              </Button>
            </div>

            {detailedRows.length === 0 ? (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>
                Henüz alt ders veya konu satırı eklenmedi. "+ Ders/Konu Ekle" butonuna basarak ders dağılımını girin.
              </div>
            ) : (
              detailedRows.map((row, idx) => (
                <ExamScoreRow
                  key={row.id}
                  row={row}
                  index={idx}
                  grade={student?.grade}
                  subjects={subjects}
                  examType={examType}
                  studentTrack={student?.track}
                  onChange={updateDetailedRow}
                  onRemove={removeDetailedRow}
                />
              ))
            )}

            {detailedRows.length > 0 && examType !== 'Okul' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                Hesaplanan Toplam Net: {computeDetailedTotalNet()}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="primary" disabled={addExamMutation.isPending} onClick={handleSaveExam}>
            {addExamMutation.isPending ? 'Ekleniyor...' : 'Sınavı Kaydet'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

