import React, { forwardRef, useId } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({ 
  label, 
  error, 
  id, 
  type = 'text', 
  fullWidth = true,
  icon,
  className = '',
  ...props 
}, ref) => {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`${styles.input} ${error ? styles.inputError : ''} ${icon ? styles.hasIcon : ''}`}
          {...props}
        />
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = forwardRef(({
  label,
  error,
  id,
  fullWidth = true,
  children,
  className = '',
  ...props
}, ref) => {
  const reactId = useId();
  const selectId = id || reactId;

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <select
          ref={ref}
          id={selectId}
          className={`${styles.input} ${styles.select} ${error ? styles.inputError : ''}`}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';

export const Textarea = forwardRef(({
  label,
  error,
  id,
  rows = 3,
  fullWidth = true,
  className = '',
  ...props
}, ref) => {
  const reactId = useId();
  const textareaId = id || reactId;

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`${styles.input} ${styles.textarea} ${error ? styles.inputError : ''}`}
          {...props}
        />
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;
