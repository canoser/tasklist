import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Check, HelpCircle, Camera, X, Image as ImageIcon } from 'lucide-react';
import Card from '../../../components/common/Card/Card';
import { useStudentQuestions, useCreateQuestion, useResolveQuestion } from '../studentApi';
import { useCreateUploadUrl, useConfirmUpload } from '../../storage/storageApi';
import { compressImage } from '../../../utils/imageCompressor';
import LocalImageViewer from '../../../components/common/LocalImageViewer/LocalImageViewer';

export default function StudentQuestionsCard() {
  const { data: questions = [] } = useStudentQuestions();
  const createQuestion = useCreateQuestion();
  const resolveQuestion = useResolveQuestion();
  const createUpload = useCreateUploadUrl();
  const confirmUpload = useConfirmUpload();

  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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

    setIsUploading(true);
    let uploadId = null;

    try {
      if (selectedFile) {
        const compressed = await compressImage(selectedFile);
        const res = await createUpload.mutateAsync({
          fileName: compressed.name,
          fileSizeInBytes: compressed.size,
          contentType: compressed.type,
        });
        await axios.put(res.uploadUrl, compressed, { headers: { 'Content-Type': compressed.type } });
        await confirmUpload.mutateAsync(res.uploadId);
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
    } finally {
      setIsUploading(false);
    }
  };

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

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Soru Fotoğrafı Ekle"
            style={{
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: selectedFile ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)',
              color: selectedFile ? 'var(--color-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Camera size={18} />
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={handleAdd}
            style={{
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              opacity: isUploading ? 0.6 : 1
            }}
          >
            {isUploading ? 'Yükleniyor…' : 'Ekle'}
          </button>
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
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-secondary)' }}
            >
              <X size={14} />
            </button>
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
            <button
              type="button"
              onClick={() => setViewingUploadId(viewingUploadId === q.uploadId ? null : q.uploadId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: viewingUploadId === q.uploadId ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                flexShrink: 0
              }}
            >
              <Camera size={13} />
              <span>{viewingUploadId === q.uploadId ? 'Gizle' : 'Fotoğraf'}</span>
            </button>
          )}

          {q.status === 'OPEN' && (
            <button
              type="button"
              onClick={() => resolveQuestion.mutateAsync(q.id)}
              title="Çözüldü işaretle"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-success, #10b981)',
                flexShrink: 0
              }}
            >
              <Check size={16} />
            </button>
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
            <button
              type="button"
              onClick={() => setViewingUploadId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ maxWidth: '320px', maxHeight: '240px', overflow: 'hidden', borderRadius: '6px' }}>
            <LocalImageViewer uploadId={viewingUploadId} originalName="Soru Görseli" />
          </div>
        </div>
      )}
    </Card>
  );
}
