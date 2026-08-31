import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/categoryService';
import styles from './HierarchicalCategoryPicker.module.css';

const HierarchicalCategoryPicker = ({ value, onChange }) => {
  const [selections, setSelections] = useState(() => {
    const cached = categoryService.getCachedRoots();
    return cached ? [{ items: cached, selectedId: null }] : [];
  });
  const [loading, setLoading] = useState(() => !categoryService.getCachedRoots());

  useEffect(() => {
    if (!categoryService.getCachedRoots()) {
      loadRoots();
    }
  }, []);

  const loadRoots = async () => {
    setLoading(true);
    try {
      const roots = await categoryService.getRoots();
      setSelections([{ items: roots, selectedId: null }]);
    } catch (err) {
      console.error('Kök kategoriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (levelIndex, selectedId) => {
    const newSelections = selections.slice(0, levelIndex + 1);
    newSelections[levelIndex].selectedId = selectedId;

    if (!selectedId) {
      setSelections(newSelections);
      const prevId = levelIndex > 0 ? newSelections[levelIndex - 1].selectedId : null;
      onChange(prevId);
      return;
    }

    setLoading(true);
    try {
      const children = await categoryService.getChildren(selectedId);
      if (children && children.length > 0) {
        newSelections.push({ items: children, selectedId: null });
      }
      setSelections(newSelections);
      onChange(selectedId);
    } catch (err) {
      console.error('Alt kategoriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    loadRoots();
    onChange(null);
  };

  return (
    <div className={styles.pickerContainer}>
      {selections.map((level, index) => (
        <div key={index} className={styles.selectRow}>
          {index > 0 && <span className={styles.levelArrow}>→</span>}
          <select
            className={styles.select}
            value={level.selectedId || ''}
            onChange={(e) => handleSelect(index, e.target.value ? parseInt(e.target.value, 10) : null)}
            disabled={loading}
          >
            <option value="">-- Seçiniz --</option>
            {level.items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {index === selections.length - 1 && level.selectedId && (
            <button type="button" onClick={handleClear} className={styles.clearBtn} disabled={loading}>
              Temizle
            </button>
          )}
        </div>
      ))}
      {loading && <div className={styles.loadingDot}>Yükleniyor...</div>}
    </div>
  );
};

export default HierarchicalCategoryPicker;
