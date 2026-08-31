import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/categoryService';
import chainService from '../../services/chainService';
import { buildTree } from '../../utils/categoryUtils';
import HierarchicalCategoryPicker from './HierarchicalCategoryPicker';
import styles from './CategoryManagerPanel.module.css';
import { useTranslation } from 'react-i18next';

const CategoryManagerPanel = () => {
  const { t } = useTranslation('common');
  const [categories, setCategories] = useState([]);
  const [tree, setTree] = useState([]);
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddRootForm, setShowAddRootForm] = useState(false);
  const [addingChildTo, setAddingChildTo] = useState(null); // parentId
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState(null);

  // Chain state
  const [expandedChainId, setExpandedChainId] = useState(null);
  const [addingChainTo, setAddingChainTo] = useState(null); // categoryId
  const [newChainTasks, setNewChainTasks] = useState([{ title: '', deadline: '' }]);
  const [creatingChain, setCreatingChain] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCats, allChains] = await Promise.all([
        categoryService.getAll(),
        chainService.getChains()
      ]);
      setCategories(allCats);
      setTree(buildTree(allCats));
      setChains(allChains || []);
      window.dispatchEvent(new Event('categoriesUpdated'));
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Listen for chain updates from other components
    const handleChainUpdate = () => loadData();
    window.addEventListener('chainsUpdated', handleChainUpdate);
    return () => window.removeEventListener('chainsUpdated', handleChainUpdate);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm_delete_category', { defaultValue: 'Kategoriyi silmek istediğinize emin misiniz? Altındaki öğeler de etkilenebilir.' }))) return;
    try {
      await categoryService.delete(id);
      loadData();
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
      loadData();
    } catch (err) {
      console.error('Kategori eklenemedi:', err);
      alert('Kategori eklenirken hata oluştu.');
    }
  };

  // --- Chain Functions ---
  const toggleChain = (chainId) => {
    setExpandedChainId(prev => prev === chainId ? null : chainId);
  };

  const handleAddChainClick = (categoryId) => {
    setAddingChainTo(categoryId);
    setNewChainTasks([{ title: '', deadline: '' }]);
  };

  const addChainStep = () => {
    setNewChainTasks([...newChainTasks, { title: '', deadline: '' }]);
  };

  const updateChainStep = (index, field, value) => {
    const updated = [...newChainTasks];
    updated[index][field] = value;
    setNewChainTasks(updated);
  };

  const removeChainStep = (index) => {
    const updated = newChainTasks.filter((_, i) => i !== index);
    setNewChainTasks(updated);
  };

  const moveChainStep = (index, dir) => {
    if (index + dir < 0 || index + dir >= newChainTasks.length) return;
    const updated = [...newChainTasks];
    const temp = updated[index];
    updated[index] = updated[index + dir];
    updated[index + dir] = temp;
    setNewChainTasks(updated);
  };

  const handleCreateChain = async (e, categoryId) => {
    e.preventDefault();
    if (newChainTasks.some(t => !t.title.trim() || !t.deadline)) {
      alert(t('alert_chain_fill_fields', { defaultValue: 'Lütfen tüm adımların başlığını ve hedeflenen tarihini doldurun.' }));
      return;
    }
    
    setCreatingChain(true);
    try {
      const tasksToCreate = newChainTasks.map(t => ({
        ...t,
        categoryId: categoryId,
        deadline: new Date(t.deadline).toISOString(),
        taskType: 'Default'
      }));

      await chainService.createChain(tasksToCreate);
      setAddingChainTo(null);
      loadData();
      window.dispatchEvent(new Event('chainsUpdated'));
    } catch (err) {
      console.error('Zincir oluşturulamadı:', err);
      alert(t('alert_chain_create_error', { defaultValue: 'Zincir oluşturulamadı. Detaylar için konsola bakın.' }));
    } finally {
      setCreatingChain(false);
    }
  };

  // --- RENDER NODE ---
  const renderNode = (node, depth = 0) => {
    // Find chains that belong to this category (checking the first task's categoryId)
    const categoryChains = chains.filter(c => c.tasks && c.tasks.length > 0 && c.tasks[0].categoryId === node.id);

    return (
      <div key={node.id}>
        <div className={styles.treeNode} style={{ marginLeft: `${depth * 16}px` }}>
          <span className={styles.nodeName}>{node.name}</span>
          <div className={styles.nodeActions}>
            <button className={styles.addChildBtn} onClick={() => { setAddingChildTo(node.id); setAddingChainTo(null); setNewCategoryName(''); }} title={t('btn_add_subcategory', { defaultValue: 'Alt Kategori Ekle' })}>
              ＋
            </button>
            <button className={styles.deleteBtn} onClick={() => handleDelete(node.id)} title={t('btn_delete', { defaultValue: 'Sil' })}>
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
              placeholder={t('placeholder_new_subcategory', { defaultValue: 'Yeni alt kategori adı' })}
              autoFocus
            />
            <div className={styles.saveCancelBtns}>
              <button type="submit" className={styles.addRootBtn}>{t('btn_save', { defaultValue: 'Kaydet' })}</button>
              <button type="button" className={styles.deleteBtn} onClick={() => setAddingChildTo(null)}>{t('btn_cancel', { defaultValue: 'İptal' })}</button>
            </div>
          </form>
        )}

        {/* Render chains for this category */}
        <div style={{ marginLeft: `${depth * 16}px` }}>
          {categoryChains.map(chain => {
            const firstTask = chain.tasks[0];
            const completedCount = chain.tasks.filter(t => t.isCompleted).length;
            const isAllCompleted = completedCount === chain.tasks.length;
            const firstDate = new Date(chain.tasks[0].deadline).toLocaleDateString();
            const lastDate = new Date(chain.tasks[chain.tasks.length - 1].deadline).toLocaleDateString();

            return (
              <div key={chain.chainId} className={styles.chainCard}>
                <div 
                  className={styles.chainCardHeader} 
                  onClick={() => toggleChain(chain.chainId)}
                >
                  <div style={{ flex: 1 }}>
                    <div className={styles.chainTitle}>
                      🔗 {firstTask?.title} {isAllCompleted && '✅'}
                    </div>
                    <div className={styles.chainMeta}>
                      {chain.tasks.length} görev · {completedCount} tamamlandı · İlk: {firstDate} · Son: {lastDate}
                    </div>
                  </div>
                  <div className={`${styles.chevron} ${expandedChainId === chain.chainId ? styles.chevronOpen : ''}`}>
                    ▼
                  </div>
                </div>

                {expandedChainId === chain.chainId && (
                  <div className={styles.taskList}>
                    {chain.tasks.map((task, idx) => {
                      const firstPendingIndex = chain.tasks.findIndex(t => !t.isCompleted);
                      const isActive = idx === firstPendingIndex;

                      return (
                        <div 
                          key={task.id} 
                          className={`${styles.taskRow} ${task.isCompleted ? styles.taskCompleted : ''} ${isActive ? styles.taskActive : ''}`}
                        >
                          <span style={{ width: '20px' }}>{task.chainOrder}.</span>
                          <span style={{ flex: 1 }}>{task.title}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Chain Button for this Category */}
          <button className={styles.addChainBtn} onClick={() => handleAddChainClick(node.id)}>
            ＋ {t('btn_add_chain', { defaultValue: 'Bu Kategoriye Zincir Ekle' })}
          </button>

          {addingChainTo === node.id && (
            <form className={styles.createForm} onSubmit={(e) => handleCreateChain(e, node.id)}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px' }}>{t('new_chain_title', { defaultValue: 'Yeni Görev Zinciri' })}</h4>
              
              {newChainTasks.map((step, index) => (
                <div key={index} className={styles.stepRow}>
                  <span style={{ minWidth: '20px', fontWeight: 600, fontSize: '12px' }}>{index + 1}.</span>
                  <input
                    type="text"
                    className={styles.stepInput}
                    placeholder={t('placeholder_task_title', { defaultValue: 'Görev Başlığı' })}
                    value={step.title}
                    onChange={(e) => updateChainStep(index, 'title', e.target.value)}
                    required
                  />
                  <input
                    type="date"
                    className={styles.stepDateInput}
                    value={step.deadline}
                    onChange={(e) => updateChainStep(index, 'deadline', e.target.value)}
                    required
                  />
                  <button type="button" className={styles.moveBtn} onClick={() => moveChainStep(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" className={styles.moveBtn} onClick={() => moveChainStep(index, 1)} disabled={index === newChainTasks.length - 1}>↓</button>
                  <button type="button" className={styles.moveBtn} onClick={() => removeChainStep(index)} disabled={newChainTasks.length === 1} style={{ color: '#ef4444' }}>✕</button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="button" className={styles.secondaryBtn} onClick={addChainStep}>
                  ＋ {t('btn_add_step', { defaultValue: 'Adım Ekle' })}
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={creatingChain}>
                  {creatingChain ? t('creating', { defaultValue: 'Oluşturuluyor...' }) : t('btn_save', { defaultValue: 'Kaydet' })}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={() => setAddingChainTo(null)} disabled={creatingChain}>
                  {t('btn_cancel', { defaultValue: 'İptal' })}
                </button>
              </div>
            </form>
          )}
        </div>

        {node.children && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  // Check for uncategorized chains (chains where first task has no category)
  const uncategorizedChains = chains.filter(c => c.tasks && c.tasks.length > 0 && !c.tasks[0].categoryId);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 style={{ margin: 0 }}>{t('category_management', { defaultValue: 'Kategori Yönetimi' })}</h3>
        <button 
          className={styles.addRootBtn} 
          onClick={() => { setShowAddRootForm(!showAddRootForm); setAddingChildTo(null); setAddingChainTo(null); }}
        >
          {showAddRootForm ? t('btn_cancel', { defaultValue: 'İptal' }) : `＋ ${t('btn_new_root_category', { defaultValue: 'Yeni Kök Kategori' })}`}
        </button>
      </div>

      {showAddRootForm && (
        <form className={styles.inlineForm} style={{ flexDirection: 'column', padding: '12px', marginBottom: '16px' }} onSubmit={(e) => handleCreate(e)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              className={styles.inlineInput}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('placeholder_new_category', { defaultValue: 'Yeni kategori adı' })}
              autoFocus
            />
            <div style={{ fontSize: '13px' }}>{t('opt_parent_category', { defaultValue: 'İsteğe bağlı: Üst Kategori Seçin (Boş bırakılırsa kök olur)' })}</div>
            <HierarchicalCategoryPicker
              value={newCategoryParentId}
              onChange={(id) => setNewCategoryParentId(id)}
            />
            <div className={styles.saveCancelBtns} style={{ marginTop: '8px' }}>
              <button type="submit" className={styles.addRootBtn}>{t('btn_save', { defaultValue: 'Kaydet' })}</button>
              <button type="button" className={styles.deleteBtn} onClick={() => setShowAddRootForm(false)}>{t('btn_cancel', { defaultValue: 'İptal' })}</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p>{t('loading', { defaultValue: 'Yükleniyor...' })}</p>
      ) : tree.length === 0 && uncategorizedChains.length === 0 ? (
        <p className={styles.nodeName}>{t('empty_categories', { defaultValue: 'Henüz kategori veya zincir yok.' })}</p>
      ) : (
        <div>
          {tree.map(rootNode => renderNode(rootNode))}

          {/* Render Uncategorized Chains */}
          {uncategorizedChains.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className={styles.treeNode}>
                <span className={styles.nodeName} style={{ color: 'var(--text3)' }}>
                  {t('uncategorized_chains', { defaultValue: 'Kategorisiz Zincirler' })}
                </span>
              </div>
              <div>
                {uncategorizedChains.map(chain => {
                  const firstTask = chain.tasks[0];
                  const completedCount = chain.tasks.filter(t => t.isCompleted).length;
                  const isAllCompleted = completedCount === chain.tasks.length;
                  const firstDate = new Date(chain.tasks[0].deadline).toLocaleDateString();
                  const lastDate = new Date(chain.tasks[chain.tasks.length - 1].deadline).toLocaleDateString();

                  return (
                    <div key={chain.chainId} className={styles.chainCard}>
                      <div 
                        className={styles.chainCardHeader} 
                        onClick={() => toggleChain(chain.chainId)}
                      >
                        <div style={{ flex: 1 }}>
                          <div className={styles.chainTitle}>
                            🔗 {firstTask?.title} {isAllCompleted && '✅'}
                          </div>
                          <div className={styles.chainMeta}>
                            {chain.tasks.length} görev · {completedCount} tamamlandı · İlk: {firstDate} · Son: {lastDate}
                          </div>
                        </div>
                        <div className={`${styles.chevron} ${expandedChainId === chain.chainId ? styles.chevronOpen : ''}`}>
                          ▼
                        </div>
                      </div>

                      {expandedChainId === chain.chainId && (
                        <div className={styles.taskList}>
                          {chain.tasks.map((task, idx) => {
                            const firstPendingIndex = chain.tasks.findIndex(t => !t.isCompleted);
                            const isActive = idx === firstPendingIndex;

                            return (
                              <div 
                                key={task.id} 
                                className={`${styles.taskRow} ${task.isCompleted ? styles.taskCompleted : ''} ${isActive ? styles.taskActive : ''}`}
                              >
                                <span style={{ width: '20px' }}>{task.chainOrder}.</span>
                                <span style={{ flex: 1 }}>{task.title}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                  {new Date(task.deadline).toLocaleDateString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryManagerPanel;
