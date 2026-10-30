import React from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import StatusBadge from '../StatusBadge/StatusBadge';
import { useDevices, useSetDownloadDevice } from '../../../features/storage/storageApi';
import styles from './DevicePickerModal.module.css';

export default function DevicePickerModal({ open, onClose, onDontShowAgain }) {
  const { data: devices = [] } = useDevices();
  const setDevice = useSetDownloadDevice();

  return (
    <Modal isOpen={!!open} onClose={onClose} title="Dosyalar hangi cihaza insin?" maxWidth="420px">
      <p className={styles.hint}>Değişiklik yalnızca yeni dosyaları etkiler.</p>
      <ul className={styles.list}>
        {devices.map((d) => (
          <li key={d.id} className={styles.item}>
            <span className={styles.label}>
              {d.label} <em>({d.platform})</em>
            </span>
            {d.isSelected ? (
              <StatusBadge status="APPROVED" label="Seçili" size="sm" />
            ) : (
              <Button size="xs" variant="outline" onClick={() => setDevice.mutate(d.id)}>
                Seç
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        {onDontShowAgain && (
          <Button size="sm" variant="ghost" onClick={onDontShowAgain}>
            Tekrar gösterme
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={onClose}>
          Kapat
        </Button>
      </div>
    </Modal>
  );
}
