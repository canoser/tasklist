import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { useUpdateCoachNotes } from '../../coachApi';
import { useCoachStudentPersonalNotes } from '../../api/coachToolsQuestionsApi';
import styles from '../CoachStudentDetail.module.css';

export default function NotesTab({ studentId, notesList = [], isNotesLoading }) {
  const [localNotes, setLocalNotes] = useState('');
  const updateNotesMutation = useUpdateCoachNotes();
  const { data: studentSharedNotes = [], isLoading: isStudentNotesLoading } = useCoachStudentPersonalNotes(studentId);

  const handleSaveNotes = () => {
    if (!localNotes.trim()) return;
    updateNotesMutation.mutate(
      { studentId, notes: localNotes },
      {
        onSuccess: () => {
          setLocalNotes('');
        },
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card title="Koç Notları" className={styles.notesCard}>
        <div className={styles.notesList}>
          {isNotesLoading ? (
            <p>Notlar yükleniyor...</p>
          ) : notesList && notesList.length > 0 ? (
            notesList.map((note) => (
              <div key={note.id} className={styles.noteItem}>
                <p className={styles.noteContent}>{note.content || note.notes}</p>
                <span className={styles.noteDate}>
                  {new Date(note.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          ) : (
            <p>Henüz not eklenmemiş.</p>
          )}
        </div>

        <div className={styles.addNoteForm}>
          <textarea
            placeholder="Öğrenci hakkında yeni not yazın..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            rows={3}
            className={styles.textarea}
          />
          <Button variant="primary" onClick={handleSaveNotes} disabled={updateNotesMutation.isPending || !localNotes.trim()}>
            {updateNotesMutation.isPending ? 'Ekleniyor...' : 'Not Ekle'}
          </Button>
          {updateNotesMutation.isSuccess && <span style={{ marginLeft: '10px', color: 'green' }}>✓ Eklendi</span>}
          {updateNotesMutation.isError && <span style={{ marginLeft: '10px', color: 'red' }}>✖ Hata oluştu</span>}
        </div>
      </Card>

      <Card title="Öğrencinin Paylaştığı Notlar (Koçum da Görsün)" className={styles.notesCard}>
        <div className={styles.notesList}>
          {isStudentNotesLoading ? (
            <p>Öğrenci notları yükleniyor...</p>
          ) : studentSharedNotes && studentSharedNotes.length > 0 ? (
            studentSharedNotes.map((sn) => (
              <div key={sn.id} className={styles.noteItem}>
                {sn.title && <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.88rem' }}>{sn.title}</strong>}
                <p className={styles.noteContent}>{sn.content}</p>
                <span className={styles.noteDate}>
                  {sn.updatedAt
                    ? new Date(sn.updatedAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            ))
          ) : (
            <p>Öğrenci henüz sizinle paylaşılan bir kişisel not eklememiş.</p>
          )}
        </div>
      </Card>
    </div>
  );
}


