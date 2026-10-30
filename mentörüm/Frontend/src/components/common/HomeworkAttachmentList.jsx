import React from 'react';
import { Download } from 'lucide-react';
import { useDownloadUrl } from '../../features/storage/storageApi';

const HomeworkAttachmentList = ({ attachments, showLabel = true }) => {
  const download = useDownloadUrl();

  if (!attachments || attachments.length === 0) return null;

  const handleOpen = async (att) => {
    if (att.url) {
      window.open(att.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!att.id) return;
    try {
      const res = await download.mutateAsync(att.id);
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      alert('Dosya indirilemedi.');
    }
  };

  return (
    <div style={{ marginBottom: '10px' }}>
      {showLabel && (
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-muted)', marginBottom: '4px' }}>
          Ödev Ekleri & Materyaller:
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {attachments.map((att) => (
          <button
            key={att.id}
            type="button"
            onClick={() => handleOpen(att)}
            disabled={download.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              color: 'var(--color-primary)',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <Download size={12} />
            <span>{att.originalName || att.fileName || 'Dosya'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeworkAttachmentList;
