/**
 * Düz kategori listesini ağaç yapısına dönüştürür.
 * @param {Category[]} categories
 * @returns {CategoryNode[]} - her node'da children dizisi var
 */
export function buildTree(categories) {
  const map = {};
  const roots = [];

  categories.forEach(cat => {
    map[cat.id] = { ...cat, children: [] };
  });

  categories.forEach(cat => {
    if (cat.parentId == null) {
      roots.push(map[cat.id]);
    } else if (map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    }
  });

  return roots;
}

/**
 * Kategori ID'sinden tam yolu döndürür (breadcrumb için).
 * Örn: "Okul > Fizik > Basınç"
 * @param {number} categoryId
 * @param {Category[]} allCategories
 * @returns {string}
 */
export function getCategoryPath(categoryId, allCategories) {
  const path = [];
  let current = allCategories.find(c => c.id === categoryId);
  while (current) {
    path.unshift(current.name);
    current = current.parentId != null
      ? allCategories.find(c => c.id === current.parentId)
      : null;
  }
  return path.join(' > ');
}
