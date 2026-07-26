/**
 * utils/taskUtils.js
 * Görev sınıflandırma ve renk hesaplama yardımcı fonksiyonları.
 * DRY prensibi: CalendarView, DayDetailModal, Timeline gibi birden fazla
 * bileşen aynı mantığa ihtiyaç duyduğundan tek yerden yönetilir.
 */

/** Öğrenci rolüne ait ders listesi */
export const STUDENT_SUBJECTS = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'];

/**
 * Görevin rolünü döndürür.
 * @param {object} task
 * @returns {'Teacher' | 'Student' | 'Other'}
 */
export function getTaskRole(task) {
  if (task.isTeacherAssigned) return 'Teacher';
  if (STUDENT_SUBJECTS.includes(task.subject)) return 'Student';
  return 'Other';
}

/**
 * Görevin renk kodunu döndürür.
 * @param {object} task
 * @returns {'Orange' | 'Blue' | 'Green' | 'Purple'}
 */
export function getTaskColor(task) {
  if (task.isCompleted) return 'Green';
  if (task.color) return task.color;
  const role = getTaskRole(task);
  if (role === 'Teacher') return 'Orange';
  if (role === 'Student') return 'Blue';
  return 'Purple';
}

/**
 * Görev listesini rol bazında gruplar (Öğretmen > Öğrenci > Diğer).
 * @param {Array} tasks
 * @returns {{ Teacher: object[], Student: object[], Other: object[] }}
 */
export function groupTasksByRole(tasks) {
  const groups = { Teacher: [], Student: [], Other: [] };
  tasks.forEach(task => {
    groups[getTaskRole(task)].push(task);
  });
  return groups;
}

/**
 * Görev listesini kategori (ders) bazında ağaç yapısına çevirir.
 * @param {Array} taskList
 * @returns {object}  { 'Matematik': [task, ...], ... }
 */
export function buildCategoryTree(taskList) {
  const tree = {};
  taskList.forEach(t => {
    const cat = t.subject || 'Genel';
    if (!tree[cat]) tree[cat] = [];
    tree[cat].push(t);
  });
  return tree;
}
