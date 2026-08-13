import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DropdownSelect.module.css';

const ChevronIcon = ({ isOpen }) => (
  <svg 
    width="14" height="14" viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '6px', opacity: 0.7 }}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const DropdownSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={wrapperRef} className={styles.wrapper} style={{ zIndex: isOpen ? 100 : 1 }}>
      <button 
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.14 }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                className={`${styles.dropdownItem} ${option.value === value ? styles.selected : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropdownSelect;
