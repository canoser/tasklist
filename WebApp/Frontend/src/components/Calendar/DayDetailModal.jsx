import { useEffect, useState, useMemo } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon, FolderIcon, CheckIcon, EditIcon, CalendarIcon } from '../Common/Icons';
import { groupTasksByRole, buildCategoryTree, getTagColors } from '../../utils/taskUtils';
import styles from './DayDetailModal.module.css';
import { useTranslation } from 'react-i18next';

const DayDetailModal = ({ isOpen, onClose, date, tasks = [], roles = [], tone, onTaskToggle, onTaskPostpone, onTaskEdit }) => {
  const { t, i18n } = useTranslation('common');
  
  // Manuel kapatma (Çarpı veya dışarı tıklama)
  const handleManualClose = () => {
    onClose();
  };

  const groupedTasks = useMemo(() => {
    if (!date || !Array.isArray(tasks)) return { Teacher: {}, Student: {}, Other: {} };

    const dayTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      const tDate = new Date(t.deadline);
      return tDate.getDate() === date.getDate() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getFullYear() === date.getFullYear();
    });

    // Rol + Kategori gruplama
    const byRole = groupTasksByRole(dayTasks);
    
    // Ağaç yapısını oluştur
    const result = {};
    for (const roleName in byRole) {
      result[roleName] = buildCategoryTree(byRole[roleName]);
    }
    return result;
  }, [date, tasks]);

  const currentLang = i18n.language || 'tr-TR';
  const dateStr = date ? date.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
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
            <div 
              key={task.id} 
              className={styles.taskLeaf} 
            >
              <div className={styles.taskInfo}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.taskMeta}>
                  {task.time || '12:00'} • {task.targetCount || task.count || '-'}
                </span>
                <span className={`${styles.statusBadge} ${
                  task.isCompleted ? styles.statusCompleted : 
                  task.partialPercent ? styles.statusPartial : styles.statusPending
                }`}>
                  {task.isCompleted ? t('task_status_completed', { context: tone }) : 
                   task.partialPercent ? t('task_status_partial', { context: tone, percent: task.partialPercent }) : 
                   t('task_status_pending', { context: tone })}
                </span>
              </div>
              
              <div className={styles.taskActions}>
                <button 
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); if (onTaskToggle) onTaskToggle(task); }}
                  title="Tamamla/Geri Al"
                >
                  <CheckIcon color={task.isCompleted ? '#10b981' : 'currentColor'} />
                </button>
                <button 
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); if (onTaskPostpone) onTaskPostpone(task); }}
                  title="Yarına Ertele"
                >
                  <CalendarIcon />
                </button>
                <button 
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); if (onTaskEdit) onTaskEdit(task); }}
                  title="Düzenle"
                >
                  <EditIcon />
                </button>
              </div>
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
              <span className={styles.taskCount}>{t('day_detail_tasks_count', { context: tone, count: totalTasksCount })}</span>
            </div>
            <button className={styles.closeBtn} onClick={handleManualClose}>
              <CloseIcon />
            </button>
          </div>

          <div className={styles.modalBody}>
        {totalTasksCount === 0 ? (
          <div className={styles.emptyState}>{t('day_detail_empty', { context: tone })}</div>
        ) : (
          <>
            {Object.entries(groupedTasks).map(([roleName, treeData]) => {
              const colors = getTagColors(roleName);
              return (
                <div key={roleName} className={styles.roleGroup}>
                  <div className={styles.roleHeader}>
                    <div 
                      className={styles.roleIcon} 
                      style={{ backgroundColor: colors.background }} 
                    /> 
                    {roleName}
                  </div>
                  {renderTree(treeData)}
                </div>
              );
            })}
          </>
        )}
      </div>
      </>
      )}
    </BaseModal>
  );
};

export default DayDetailModal;
