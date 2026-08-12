/**
 * TagSelect.jsx
 * Veri-agnostik, çoklu etiket seçimi bileşeni.
 *
 * Props:
 *   tags         {id, roleName|label}[]  Mevcut aktif etiketler
 *   onAdd        (label: string) => void  Yeni etiket ekle
 *   onRemove     (tag) => void            Etiket kaldır (useTagManager.requestRemove'a bağlanır)
 *   placeholder  string
 *   suggestions  string[]                Öneri listesi (opsiyonel)
 *   isLoading    bool                    Spinner gösterimi
 *   disabled     bool                    Tüm etkileşimi kapat
 *
 * Özellikler:
 *   - Yazınca filtrelenmiş öneri dropdown'ı açılır
 *   - Listede yoksa "X olarak ekle" seçeneği belirir
 *   - Enter / tıklama ile ekler; × ile kaldırır
 *   - Backspace: input boşsa son etiketi kaldırır
 *   - Ok tuşları ile dropdown navigasyonu
 *   - Her etiket RoleName hash'inden otomatik HSL renk alır
 *   - Framer-motion ile pill giriş/çıkış animasyonları
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './TagSelect.module.css';
import { useTranslation } from 'react-i18next';
import { getTagColors } from '../../../utils/taskUtils';

// ── Bileşen ───────────────────────────────────────────────────────────────────

const TagSelect = ({
  tags = [],
  onAdd,
  onRemove,
  placeholder = 'Ekle...',
  suggestions = [],
  isLoading = false,
  disabled = false,
  tone,
}) => {
  const { t } = useTranslation('common');
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Aktif etiket isimleri (öneri filtreleme için)
  const activeNames = tags.map((t) =>
    (t.roleName || t.label || '').toLowerCase()
  );

  // Öneri listesini filtrele: aktif olmayanlar + input'a uyanlar
  const filteredSuggestions = suggestions.filter(
    (s) =>
      !activeNames.includes(s.toLowerCase()) &&
      s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const trimmedInput = inputValue.trim();
  const showCreateOption =
    trimmedInput.length > 0 &&
    !filteredSuggestions.some((s) => s.toLowerCase() === trimmedInput.toLowerCase()) &&
    !activeNames.includes(trimmedInput.toLowerCase());

  // Dropdown öğeleri: öneriler + (varsa) "X olarak ekle"
  const CREATE_SENTINEL = `__create__:${trimmedInput}`;
  const dropdownItems = [
    ...filteredSuggestions,
    ...(showCreateOption ? [CREATE_SENTINEL] : []),
  ];

  // ── Dışarı tıkla → kapat ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Seçim ─────────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (item) => {
      const label = item.startsWith('__create__:') ? item.slice(11) : item;
      onAdd(label);
      setInputValue('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onAdd]
  );

  // ── Klavye Navigasyonu ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, dropdownItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
        handleSelect(dropdownItems[highlightedIndex]);
      } else if (trimmedInput) {
        handleSelect(CREATE_SENTINEL);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Input boşken Backspace → son etiketi kaldır
      onRemove(tags[tags.length - 1]);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      {/* ── Pill Alanı + Input ── */}
      <div
        className={`${styles.inputArea} ${disabled ? styles.disabled : ''}`}
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => {
            const name = tag.roleName || tag.label || '';
            const colors = getTagColors(name);
            return (
              <motion.span
                key={tag.id}
                className={styles.pill}
                style={{
                  background: colors.background,
                  borderColor: colors.border,
                  color: colors.color,
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                layout
              >
                {name}
                {!disabled && (
                  <button
                    className={styles.pillRemove}
                    style={{ color: colors.removeColor }}
                    onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
                    type="button"
                    aria-label={t('tag_remove_aria', { name, context: tone })}
                  >
                    ×
                  </button>
                )}
              </motion.span>
            );
          })}
        </AnimatePresence>

        {!disabled && (
          <input
            ref={inputRef}
            id="tag-select-input"
            className={styles.input}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            autoComplete="off"
            aria-autocomplete="list"
          />
        )}

        {isLoading && <span className={styles.loadingSpinner} aria-label="Yükleniyor" />}
      </div>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {isOpen && dropdownItems.length > 0 && (
          <motion.div
            className={styles.dropdown}
            role="listbox"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.14 }}
          >
            {dropdownItems.map((item, idx) => {
              const isCreate = item.startsWith('__create__:');
              const label = isCreate ? item.slice(11) : item;
              return (
                <div
                  key={item}
                  role="option"
                  aria-selected={idx === highlightedIndex}
                  className={`${styles.dropdownItem} ${isCreate ? styles.createOption : ''} ${idx === highlightedIndex ? styles.highlighted : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span className={styles.dropdownIcon}>{isCreate ? '✚' : '●'}</span>
                  <span>
                    {isCreate ? (
                      <>
                        <span className={styles.createLabel}>"{label}"</span>
                        {' '}{t('tag_create_prefix', { context: tone })}
                      </>
                    ) : label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TagSelect;
