import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import SegmentedTabs from '../../../../components/common/SegmentedTabs/SegmentedTabs';
import { MessageSquare, AlertCircle, FileText, Download, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useStudentTeacherNotes, useStudentQuestions, useStudentUploads } from '../../studentApi';

const CoachFeedbackCard = ({ homeworks = [] }) => {
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'questions' | 'files'

  const { data: teacherNotes = [] } = useStudentTeacherNotes();
  const { data: questions = [] } = useStudentQuestions();
  const { data: uploads = [] } = useStudentUploads();

  // Düzeltme istenen ödevler
  const revisionHomeworks = homeworks.filter(h => h.teacherStatus === 'REVISE_REQUESTED' || h.teacherStatus === 'CORRECTION_REQUESTED');

  // Koç tarafından yanıtlanmış sorular
  const answeredQuestions = questions.filter(q => q.coachReply || q.status === 'RESOLVED');

  const visibleTeacherNotes = teacherNotes.slice(0, 4);

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Geri Bildirimler & Dosyalar</span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Düzeltme İstenen Ödev Bildirimi */}
        {revisionHomeworks.length > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 600, fontSize: '0.825rem', marginBottom: '4px' }}>
              <AlertCircle size={15} />
              <span>Düzeltme İstenen Ödevler ({revisionHomeworks.length})</span>
            </div>
            {revisionHomeworks.map(hw => (
              <div key={hw.id} style={{ fontSize: '0.8rem', color: 'var(--text-color-main)', marginTop: '4px' }}>
                • <strong>{hw.snapshotTitle}</strong>: {hw.teacherReviewNote || 'Öğretmeniniz ödevde revizyon talep etti.'}
              </div>
            ))}
          </div>
        )}

        {/* Sekmeler */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <SegmentedTabs
            tabs={[
              { id: 'notes', label: `Öğretmen Notları (${visibleTeacherNotes.length})` },
              { id: 'questions', label: `Koç Yanıtları (${answeredQuestions.length})` },
              { id: 'files', label: `Paylaşılan Dosyalar (${uploads.length})` },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            size="sm"
          />
        </div>

        {/* 1. Öğretmen Notları */}
        {activeTab === 'notes' && (
          <div>
            {visibleTeacherNotes.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-color-muted)', fontStyle: 'italic' }}>
                Henüz öğretmen değerlendirme notu girilmemiş.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visibleTeacherNotes.map((tn) => (
                  <div key={tn.id} style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{tn.courseName || tn.teacherName}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-color-muted)' }}>
                        {tn.createdAt ? format(new Date(tn.createdAt), 'd MMM', { locale: tr }) : ''}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-color-main)', lineHeight: 1.4 }}>
                      {tn.note || tn.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Koç Yanıtları */}
        {activeTab === 'questions' && (
          <div>
            {answeredQuestions.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-color-muted)', fontStyle: 'italic' }}>
                Koçunuz tarafından yanıtlanan bir soru bulunmuyor.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {answeredQuestions.slice(0, 3).map((q) => (
                  <div key={q.id} style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-color-main)', marginBottom: '4px' }}>
                      <HelpCircle size={13} color="var(--color-primary)" />
                      <span>{q.topicText}</span>
                    </div>
                    {q.coachReply && (
                      <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', marginTop: '4px', fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: 600, color: '#065f46' }}>Koçun Cevabı: </span>
                        <span>{q.coachReply}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Dosyalar */}
        {activeTab === 'files' && (
          <div>
            {uploads.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-color-muted)', fontStyle: 'italic' }}>
                Paylaşılan materyal veya dosya bulunmuyor.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uploads.slice(0, 4).map((file) => (
                  <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontWeight: 500 }}>{file.fileName || file.originalFileName || 'Dosya'}</span>
                    </div>
                    {file.url && (
                      <a href={file.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.75rem' }}>
                        <Download size={13} />
                        <span>İndir</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CoachFeedbackCard;

