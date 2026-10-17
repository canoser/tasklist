import React from 'react';
import styles from './ChildSelector.module.css';

// Çok çocuklu veliler için hap/sekme butonlu çocuk seçici.
// Tek çocuk varsa (veya hiç yoksa) hiçbir şey render edilmez.
const ChildSelector = ({ children = [], selectedId, onSelect }) => {
  if (!children || children.length <= 1) return null;
  return (
    <div className={styles.container} role="tablist" aria-label="Çocuk seçimi">
      {children.map((c) => {
        const active = c.studentId === selectedId;
        return (
          <button
            key={c.studentId}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => onSelect(c.studentId)}
          >
            {c.fullName}
          </button>
        );
      })}
    </div>
  );
};

export default ChildSelector;
