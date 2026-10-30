import React from 'react';
import { Download } from 'lucide-react';
import { useOpenUpload } from '../../features/storage/storageApi';
import Button from './Button/Button';

const HomeworkAttachmentList = ({ attachments, showLabel = true }) => {
  const { openUpload, isPending } = useOpenUpload();

  if (!attachments || attachments.length === 0) return null;

  return (
    <div style={{ marginBottom: '10px' }}>
      {showLabel && (
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-muted)', marginBottom: '4px' }}>
          Ödev Ekleri & Materyaller:
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {attachments.map((att) => (
          <Button
            key={att.id}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => openUpload(att)}
            disabled={isPending}
          >
            <Download size={12} />
            <span>{att.originalName || att.fileName || 'Dosya'}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default HomeworkAttachmentList;
