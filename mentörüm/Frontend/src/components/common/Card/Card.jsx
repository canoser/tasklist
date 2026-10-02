import React from 'react';
import styles from './Card.module.css';

const Card = ({ children, className = '', padding = 'md', interactive = false, onClick }) => {
  return (
    <div 
      className={`${styles.card} ${styles[`padding-${padding}`]} ${interactive ? styles.interactive : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
