import React from 'react';
import styles from './Button.module.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  iconOnly = false,
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props 
}) => {
  const classNames = [
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    fullWidth ? styles.fullWidth : '',
    iconOnly ? styles.iconOnly : '',
    isLoading ? styles.loading : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className={styles.spinner}>
          {/* Simple CSS spinner icon */}
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className={styles.spinnerPath} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          </svg>
        </span>
      )}
      <span className={styles.content}>{children}</span>
    </button>
  );
};

export default Button;
