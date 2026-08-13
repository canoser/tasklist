import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/categoryService';
import { buildTree } from '../../utils/categoryUtils';
import HierarchicalCategoryPicker from './HierarchicalCategoryPicker';
import styles from './CategoryManagerPanel.module.css';

const CategoryManagerPanel = () => {
  const [categories, setCategories] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddRootForm, setShowAddRootForm] = useState(false);
  const [addingChildTo, setAddingChildTo] = useState(null); // parentId
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const all = await categoryService.getAll();
      setCategories(all);
      setTree(buildTree(all));
      window.dispatchEvent(new Event('categoriesUpdated'));
    } catch (err) {
      console.error('Kategoriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDelete = async (id) => {
    // [MOBILE_PORT_TODO]: window.confirm can block Capacitor iOS WebViews or not render well. Use a custom Modal or Dialog component instead.
    if (!window.confirm('Kategoriyi silmek istediğinize emin misiniz? Altındaki öğeler de etkilenebilir.')) return;
    try {
      await categoryService.delete(id);
      loadCategories();
    } catch (err) {
      console.error('Kategori silinemedi:', err);
      alert('Hata oluştu');
    }
  };

  const handleCreate = async (e, parentId = null) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await categoryService.create({
        name: newCategoryName,
        parentId: parentId || newCategoryParentId,
        sortOrder: 0
      });
      setNewCategoryName('');
      setNewCategoryParentId(null);
      setShowAddRootForm(false);
      setAddingChildTo(null);
      loadCategories();
    } catch (err) {
      console.error('Kategori eklenemedi:', err);
      alert('Kategori eklenirken hata oluştu.');
    }
  };

  const renderNode = (node, depth = 0) => (
    <div key={node.id}>
      <div className={styles.treeNode} style={{ marginLeft: `${depth * 16}px` }}>
        <span className={styles.nodeName}>{node.name}</span>
        <div className={styles.nodeActions}>
          <button className={styles.addChildBtn} onClick={() => { setAddingChildTo(node.id); setNewCategoryName(''); }} title="Alt Kategori Ekle">
            ＋
          </button>
          <button className={styles.deleteBtn} onClick={() => handleDelete(node.id)} title="Sil">
            🗑
          </button>
        </div>
      </div>
      
      {addingChildTo === node.id && (
        <form className={styles.inlineForm} style={{ marginLeft: `${(depth + 1) * 16}px` }} onSubmit={(e) => handleCreate(e, node.id)}>
          <input
            type="text"
            className={styles.inlineInput}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Yeni alt kategori adı"
            autoFocus
          />
          <div className={styles.saveCancelBtns}>
            <button type="submit" className={styles.addRootBtn}>Kaydet</button>
            <button type="button" className={styles.deleteBtn} onClick={() => setAddingChildTo(null)}>İptal</button>
          </div>
        </form>
      )}

      {node.children && node.children.map(child => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 style={{ margin: 0 }}>Kategori Yönetimi</h3>
        <button className={styles.addRootBtn} onClick={() => setShowAddRootForm(!showAddRootForm)}>
          ＋ Yeni Kök Kategori
        </button>
      </div>

      {showAddRootForm && (
        <form className={styles.inlineForm} onSubmit={(e) => handleCreate(e, null)} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              className={styles.inlineInput}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Yeni kategori adı"
              autoFocus
            />
            <div style={{ fontSize: '13px' }}>İsteğe bağlı: Üst Kategori Seçin (Boş bırakılırsa kök olur)</div>
            <HierarchicalCategoryPicker
              value={newCategoryParentId}
              onChange={(id) => setNewCategoryParentId(id)}
            />
            <div className={styles.saveCancelBtns} style={{ marginTop: '8px' }}>
              <button type="submit" className={styles.addRootBtn}>Kaydet</button>
              <button type="button" className={styles.deleteBtn} onClick={() => setShowAddRootForm(false)}>İptal</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p>Yükleniyor...</p>
      ) : tree.length === 0 ? (
        <p className={styles.nodeName}>Henüz kategori yok.</p>
      ) : (
        <div>
          {tree.map(rootNode => renderNode(rootNode))}
        </div>
      )}
    </div>
  );
};

export default CategoryManagerPanel;
