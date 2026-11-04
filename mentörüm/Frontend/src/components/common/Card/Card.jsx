import React from 'react';
import styles from './Card.module.css';

const Card = ({
  children,
  title,
  action,
  className = '',
  padding = 'md',
  interactive = false,
  onClick,
  style,
  ...props
}) => {
  return (
    <div
      className={`${styles.card} ${styles[`padding-${padding}`] || styles['padding-md']} ${interactive ? styles.interactive : ''} ${className}`}
      onClick={onClick}
      style={style}
      {...props}
    >
      {(title || action) && (
        <div className={styles.header}>
          {title && <div className={styles.title}>{title}</div>}
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
