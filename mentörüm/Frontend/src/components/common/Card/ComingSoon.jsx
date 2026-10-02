import React from 'react';
import Card from './Card';
import styles from './ComingSoon.module.css';

const ComingSoon = ({ title, description, icon = '🚀' }) => {
  return (
    <div className={styles.container}>
      <Card className={styles.card} padding="xl">
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <h2 className={styles.title}>{title} Çok Yakında!</h2>
        <p className={styles.description}>
          {description || 'Bu modül üzerinde harika geliştirmeler yapıyoruz. Çok yakında burada olacak!'}
        </p>
        <div className={styles.loader}>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
        </div>
      </Card>
    </div>
  );
};

export default ComingSoon;
