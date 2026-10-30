import React, { useState, useRef } from 'react';
import { Check, HelpCircle, Camera, X, Image as ImageIcon } from 'lucide-react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { useStudentQuestions, useCreateQuestion, useResolveQuestion } from '../studentApi';
import { useUploadFile } from '../../storage/storageApi';
import LocalImageViewer from '../../../components/common/LocalImageViewer/LocalImageViewer';

export default function StudentQuestionsCard() {
  const { data: questions = [] } = useStudentQuestions();
  const createQuestion = useCreateQuestion();
  const resolveQuestion = useResolveQuestion();
  const uploadFile = useUploadFile();

  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingUploadId, setViewingUploadId] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAdd = async () => {
    if (!text.trim() && !selectedFile) return;

    let uploadId = null;

    try {
      if (selectedFile) {
        const res = await uploadFile.mutateAsync({ file: selectedFile });
        uploadId = res.uploadId;
      }

      await createQuestion.mutateAsync({
        topicText: text.trim() || 'Fotoğraflı soru',
        uploadId: uploadId || undefined,
      });

      setText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert('Soru veya fotoğraf eklenirken hata: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  const isUploading = uploadFile.isPending || createQuestion.isPending;

  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Takıldığım Konular / Sorulacaklar</h3>

      {/* Giriş ve Fotoğraf Alanı */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isUploading && handleAdd()}
            placeholder="Anlamadığın konu / çözemediğin soru tipi..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-app)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant={selectedFile ? 'primary' : 'outline'}
            size="sm"
            iconOnly
            onClick={() => fileInputRef.current?.click()}
            title="Soru Fotoğrafı Ekle"
          >
            <Camera size={18} />
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isUploading}
            onClick={handleAdd}
          >
            {isUploading ? 'Yükleniyor…' : 'Ekle'}
          </Button>
        </div>

        {/* Seçilen Fotoğraf Önizleme Çipi */}
        {selectedFile && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            width: 'fit-content'
          }}>
            <ImageIcon size={14} style={{ color: 'var(--color-primary)' }} />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              iconOnly
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X size={14} />
            </Button>
          </div>
        )}
      </div>

      {questions.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Henüz eklenmiş soru yok.</p>
      )}

      {/* Soru Listesi */}
      {questions.map((q) => (
        <div
          key={q.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            borderBottom: '1px solid var(--border-color)',
            opacity: q.status === 'RESOLVED' ? 0.5 : 1
          }}
        >
          <HelpCircle size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{
            flex: 1,
            fontSize: '0.85rem',
            textDecoration: q.status === 'RESOLVED' ? 'line-through' : 'none',
            wordBreak: 'break-word'
          }}>
            {q.topicText}
          </span>

          {/* Soru Fotoğrafı Varsa Göster Butonu */}
          {q.uploadId && (
            <Button
              type="button"
              variant={viewingUploadId === q.uploadId ? 'primary' : 'outline'}
              size="xs"
              onClick={() => setViewingUploadId(viewingUploadId === q.uploadId ? null : q.uploadId)}
            >
              <Camera size={13} />
              <span>{viewingUploadId === q.uploadId ? 'Gizle' : 'Fotoğraf'}</span>
            </Button>
          )}

          {q.status === 'OPEN' && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              iconOnly
              onClick={() => resolveQuestion.mutateAsync(q.id)}
              title="Çözüldü işaretle"
              style={{ color: 'var(--color-success, #10b981)' }}
            >
              <Check size={16} />
            </Button>
          )}
        </div>
      ))}

      {/* Fotoğraf Görüntüleme Modalı / Paneli */}
      {viewingUploadId && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Soru Görseli</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              iconOnly
              onClick={() => setViewingUploadId(null)}
            >
              <X size={16} />
            </Button>
          </div>
          <div style={{ maxWidth: '320px', maxHeight: '240px', overflow: 'hidden', borderRadius: '6px' }}>
            <LocalImageViewer uploadId={viewingUploadId} originalName="Soru Görseli" />
          </div>
        </div>
      )}
    </Card>
  );
}
