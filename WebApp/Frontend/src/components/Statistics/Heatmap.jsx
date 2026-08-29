import React from 'react';
import styles from './Heatmap.module.css';

/**
 * A lightweight GitHub-style Heatmap grid (12 weeks x 7 days)
 * @param {Object} data - Key: "YYYY-MM-DD", Value: count (e.g. { "2026-08-25": 5 })
 */
const Heatmap = ({ data = {} }) => {
  const weeks = 12;
  const daysPerWeek = 7;
  const totalDays = weeks * daysPerWeek;
  
  // Create an array of the last `totalDays` dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight
  
  const dates = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }

  // Get color intensity based on count
  const getColorClass = (count) => {
    if (!count || count === 0) return styles.level0;
    if (count === 1) return styles.level1;
    if (count <= 3) return styles.level2;
    if (count <= 5) return styles.level3;
    return styles.level4;
  };

  // Organize dates by day of week (0 = Sunday, 6 = Saturday)
  // To match typical GitHub style, rows are days of the week, columns are weeks.
  // We'll align the grid visually using CSS grid `grid-auto-flow: column;`
  
  return (
    <div className={styles.heatmapContainer}>
      <div className={styles.grid}>
        {dates.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0];
          const count = data[dateStr] || 0;
          return (
            <div
              key={dateStr}
              className={`${styles.cell} ${getColorClass(count)}`}
              title={`${dateStr}: ${count} görev`}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

export default Heatmap;
