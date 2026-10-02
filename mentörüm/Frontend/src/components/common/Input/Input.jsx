import React, { forwardRef, useId } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({ 
  label, 
  error, 
  id, 
  type = 'text', 
  fullWidth = true,
  icon,
  ...props 
}, ref) => {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
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

export default Input;
