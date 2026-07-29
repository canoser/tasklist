/**
 * utils/taskUtils.js
 * Görev sınıflandırma ve renk hesaplama yardımcı fonksiyonları.
 * DRY prensibi: CalendarView, DayDetailModal, Timeline gibi birden fazla
 * bileşen aynı mantığa ihtiyaç duyduğundan tek yerden yönetilir.
 */

/**
 * String hash'inden deterministik, tema uyumlu bir HSL renk kümesi üretir.
 * Aynı isim her zaman aynı rengi verir. TagSelect ve Calendar ortak kullanır.
 */

/** Öğrenci rolüne ait ders listesi (Geriye uyumluluk için) */
export const STUDENT_SUBJECTS = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'];

/**
 * Görevin statik rolünü döndürür (Geriye uyumluluk için, Timeline.jsx kullanır).
 * @param {object} task
 * @returns {'Teacher' | 'Student' | 'Other'}
 */
export function getTaskRole(task) {
  if (task.isTeacherAssigned) return 'Teacher';
  if (STUDENT_SUBJECTS.includes(task.subject)) return 'Student';
  return 'Other';
}

/**
 * Görevin statik renk kodunu döndürür (Geriye uyumluluk için, Timeline.jsx kullanır).
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

export const getTagColors = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsla(${hue}, 65%, 16%, 0.85)`,
    border: `hsla(${hue}, 70%, 48%, 0.5)`,
    color: `hsl(${hue}, 80%, 78%)`,
    removeColor: `hsla(${hue}, 80%, 78%, 0.7)`,
  };
};

/**
 * Görev listesini rol bazında gruplar.
 * Dinamik UserRole objelerine göre çalışır.
 * @param {Array} tasks
 * @returns {object} { 'Rol Adı': [task1, task2], ... }
 */
export function groupTasksByRole(tasks) {
  const groups = {};
  tasks.forEach(task => {
    // Backend tam entegre olmadığında mock fallback "Diğer"
    const rName = task.roleName || 'Diğer / Kişisel';
    if (!groups[rName]) groups[rName] = [];
    groups[rName].push(task);
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
