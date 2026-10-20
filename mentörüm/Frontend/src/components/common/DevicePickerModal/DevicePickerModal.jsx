import { useDevices, useSetDownloadDevice } from '../../../features/storage/storageApi';
import styles from './DevicePickerModal.module.css';

export default function DevicePickerModal({ open, onClose, onDontShowAgain }) {
    const { data: devices = [] } = useDevices();
    const setDevice = useSetDownloadDevice();

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.title}>Dosyalar hangi cihaza insin?</h3>
                <p className={styles.hint}>Değişiklik yalnızca yeni dosyaları etkiler.</p>
                <ul className={styles.list}>
                    {devices.map((d) => (
                        <li key={d.id} className={styles.item}>
                            <span className={styles.label}>{d.label} <em>({d.platform})</em></span>
                            {d.isSelected ? (
                                <span className={styles.badge}>Seçili</span>
                            ) : (
                                <button className={styles.select} onClick={() => setDevice.mutate(d.id)}>Seç</button>
                            )}
                        </li>
                    ))}
                </ul>
                <div className={styles.actions}>
                    {onDontShowAgain && (
                        <button className={styles.dismiss} onClick={onDontShowAgain}>Tekrar gösterme</button>
                    )}
                    <button className={styles.close} onClick={onClose}>Kapat</button>
                </div>
            </div>
        </div>
    );
}
