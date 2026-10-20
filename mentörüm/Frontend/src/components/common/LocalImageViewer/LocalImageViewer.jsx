import { useEffect, useState } from 'react';
import { apiClient } from '../../../api/apiClient';
import styles from './LocalImageViewer.module.css';

// Local-First görüntüleyici: yerel kopya yoksa R2 presigned GET ile açar.
export default function LocalImageViewer({ uploadId, originalName }) {
    const [src, setSrc] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiClient.get(`/uploads/${uploadId}/url`);
                if (!cancelled) setSrc(res.url);
            } catch {
                if (!cancelled) setError(true);
            }
        })();
        return () => { cancelled = true; };
    }, [uploadId]);

    if (error) return <div className={styles.placeholder}>Dosya artık bulutta değil.</div>;
    if (!src) return <div className={styles.placeholder}>Yükleniyor…</div>;
    return <img src={src} alt={originalName || 'Dosya'} className={styles.viewer} />;
}
