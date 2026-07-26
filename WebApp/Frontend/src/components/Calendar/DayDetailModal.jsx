import { useEffect, useState, useMemo } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon, FolderIcon } from '../Common/Icons';
import { groupTasksByRole, buildCategoryTree } from '../../utils/taskUtils';
import styles from './DayDetailModal.module.css';

const DayDetailModal = ({ isOpen, onClose, date, tasks = [], onTaskClick }) => {
  
  // Manuel kapatma (Çarpı veya dışarı tıklama)
  const handleManualClose = () => {
    onClose();
  };

  const groupedTasks = useMemo(() => {
    if (!date) return { Teacher: {}, Student: {}, Other: {} };

    const dayTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      const tDate = new Date(t.deadline);
      return tDate.getDate() === date.getDate() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getFullYear() === date.getFullYear();
    });

    // Rol + Kategori gruplama — taskUtils'ten gelen ortak fonksiyonlar
    const byRole = groupTasksByRole(dayTasks);
    return {
      Teacher: buildCategoryTree(byRole.Teacher),
      Student: buildCategoryTree(byRole.Student),
      Other: buildCategoryTree(byRole.Other),
    };
  }, [date, tasks]);

  const dateStr = date ? date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const totalTasksCount = Object.values(groupedTasks).reduce((sum, roleGroup) => {
    return sum + Object.values(roleGroup).reduce((s, arr) => s + arr.length, 0);
  }, 0);

  // Helper: Alt ağaç (Dallar) Render
  const renderTree = (treeData) => {
    return Object.entries(treeData).map(([category, taskList]) => (
      <div key={category} className={styles.categoryNode}>
        <div className={styles.categoryTitle}>
          <span className={styles.folderIcon}><FolderIcon /></span>
          {category}
        </div>
        <div className={styles.treeBranch}>
          {taskList.map(task => (
            <div key={task.id} className={styles.taskLeaf} onClick={() => onTaskClick && onTaskClick(task)}>
              <div className={styles.taskInfo}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.taskMeta}>
                  {task.time || '12:00'} • {task.targetCount || task.count || '-'}
                </span>
              </div>
              <span className={`${styles.statusBadge} ${
                task.isCompleted ? styles.statusCompleted : 
                task.partialPercent ? styles.statusPartial : styles.statusPending
              }`}>
                {task.isCompleted ? 'Tamamlandı' : 
                 task.partialPercent ? `%${task.partialPercent} Bitti` : 'Bekliyor'}
              </span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleManualClose}>
      {date && (
        <>
          <div className={styles.modalHeader}>
            <div className={styles.headerLeft}>
              <span className={styles.dateTitle}>{dateStr}</span>
              <span className={styles.taskCount}>{totalTasksCount} Görev</span>
            </div>
            <button className={styles.closeBtn} onClick={handleManualClose}>
              <CloseIcon />
            </button>
          </div>

          <div className={styles.modalBody}>
        {totalTasksCount === 0 ? (
          <div className={styles.emptyState}>Bu güne ait görev bulunmuyor.</div>
        ) : (
          <>
            {Object.keys(groupedTasks.Teacher).length > 0 && (
              <div className={styles.roleGroup}>
                <div className={styles.roleHeader}>
                  <div className={`${styles.roleIcon} ${styles.Teacher}`} /> Öğretmen Rolü
                </div>
                {renderTree(groupedTasks.Teacher)}
              </div>
            )}
            
            {Object.keys(groupedTasks.Student).length > 0 && (
              <div className={styles.roleGroup}>
                <div className={styles.roleHeader}>
                  <div className={`${styles.roleIcon} ${styles.Student}`} /> Öğrenci Rolü
                </div>
                {renderTree(groupedTasks.Student)}
              </div>
            )}

            {Object.keys(groupedTasks.Other).length > 0 && (
              <div className={styles.roleGroup}>
                <div className={styles.roleHeader}>
                  <div className={`${styles.roleIcon} ${styles.Other}`} /> Diğer / Kişisel
                </div>
                {renderTree(groupedTasks.Other)}
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}
    </BaseModal>
  );
};

export default DayDetailModal;
