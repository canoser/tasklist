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
  const [creatingChain, setCreatingChain] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    taskType: 'Soru Çözme',
    targetCount: '',
    recurrenceType: 'Daily',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    daysOfWeek: [],
    customDates: []
  });
  
  const [customDateInput, setCustomDateInput] = useState('');

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
    setTemplateForm({
      title: '',
      description: '',
      taskType: 'Soru Çözme',
      targetCount: '',
      recurrenceType: 'Daily',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      daysOfWeek: [],
      customDates: []
    });
  };

  const handleCreateChainTemplate = async (e, categoryId) => {
    e.preventDefault();
    if (!templateForm.title.trim()) {
      alert(t('alert_chain_title_required', { defaultValue: 'Lütfen zincir başlığını doldurun.' }));
      return;
    }

    if (templateForm.recurrenceType === 'Custom' && templateForm.customDates.length === 0) {
      alert(t('alert_min_custom_dates', { defaultValue: 'Lütfen en az bir özel tarih ekleyin.' }));
      return;
    }
    
    setCreatingChain(true);
    try {
      const isCustom = templateForm.recurrenceType === 'Custom';
      const templateData = {
        ...templateForm,
        categoryId: categoryId,
        targetCount: templateForm.targetCount ? parseInt(templateForm.targetCount) : null,
        daysOfWeek: templateForm.recurrenceType === 'Weekly' ? JSON.stringify(templateForm.daysOfWeek) : null,
        customDates: isCustom ? JSON.stringify(templateForm.customDates) : null,
        startDate: isCustom 
          ? (templateForm.customDates.length > 0 ? new Date(templateForm.customDates[0]).toISOString() : null)
          : (templateForm.startDate ? new Date(templateForm.startDate).toISOString() : null),
        endDate: isCustom 
          ? null 
          : (templateForm.endDate ? new Date(templateForm.endDate).toISOString() : null),
      };

      await chainService.createChainTemplate(templateData);
      
      // Oluşturduktan sonra lazy generator'ı tetikle ki hemen görevler oluşsun
      await chainService.generateTasks();
      
      setAddingChainTo(null);
      loadData();
      window.dispatchEvent(new Event('chainsUpdated'));
    } catch (err) {
      console.error('Zincir şablonu oluşturulamadı:', err);
      alert('Zincir oluşturulamadı. Detaylar için konsola bakın.');
    } finally {
      setCreatingChain(false);
    }
  };
  
  const handleDeleteChain = async (chainId, e) => {
      e.stopPropagation();
      if (!window.confirm("Bu zincir şablonunu silmek istediğinize emin misiniz? (Önceden oluşturulan görevler silinmez)")) return;
      try {
          await chainService.deleteChainTemplate(chainId);
          loadData();
      } catch(err) {
          console.error(err);
      }
  }

  const toggleDayOfWeek = (day) => {
    setTemplateForm(prev => {
      const exists = prev.daysOfWeek.includes(day);
      if (exists) {
        return { ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== day) };
      } else {
        return { ...prev, daysOfWeek: [...prev.daysOfWeek, day] };
      }
    });
  };

  const addCustomDate = () => {
    if (!customDateInput) return;
    if (templateForm.customDates.length >= 30) {
      alert(t('alert_max_custom_dates', { defaultValue: 'En fazla 30 özel tarih ekleyebilirsiniz.' }));
      return;
    }
    if (!templateForm.customDates.includes(customDateInput)) {
      setTemplateForm(prev => ({
        ...prev,
        customDates: [...prev.customDates, customDateInput].sort()
      }));
      setCustomDateInput('');
    }
  };
  
  const removeCustomDate = (dateToRemove) => {
    setTemplateForm(prev => ({
      ...prev,
      customDates: prev.customDates.filter(d => d !== dateToRemove)
    }));
  };

  // --- RENDER NODE ---
  const renderNode = (node, depth = 0) => {
    const categoryChains = chains.filter(c => c.categoryId === node.id);

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
            return (
              <div key={chain.id} className={styles.chainCard}>
                <div 
                  className={styles.chainCardHeader} 
                  onClick={() => toggleChain(chain.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div className={styles.chainTitle}>
                      🔗 {chain.title}
                    </div>
                    <div className={styles.chainMeta}>
                      Tekrar: {chain.recurrenceType === 'Daily' ? 'Her Gün' : chain.recurrenceType === 'Weekly' ? 'Belirli Günler' : 'Özel Tarihler'} 
                      {chain.taskType && ` · ${chain.taskType}`}
                      {chain.targetCount ? ` · Hedef: ${chain.targetCount}` : ''}
                    </div>
                  </div>
                  <button className={styles.deleteBtn} onClick={(e) => handleDeleteChain(chain.id, e)}>🗑</button>
                  <div className={`${styles.chevron} ${expandedChainId === chain.id ? styles.chevronOpen : ''}`}>
                    ▼
                  </div>
                </div>

                {expandedChainId === chain.id && (
                  <div className={styles.taskList} style={{ padding: '12px' }}>
                     <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
                         <strong>Açıklama:</strong> {chain.description || 'Yok'}<br/>
                         <strong>Başlangıç:</strong> {chain.startDate ? new Date(chain.startDate).toLocaleDateString() : 'Yok'}<br/>
                         <strong>Bitiş:</strong> {chain.endDate ? new Date(chain.endDate).toLocaleDateString() : 'Yok'}<br/>
                         <strong>Son Üretim:</strong> {chain.lastGeneratedDate ? new Date(chain.lastGeneratedDate).toLocaleDateString() : 'Yok'}
                     </div>
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
            <form className={styles.createForm} onSubmit={(e) => handleCreateChainTemplate(e, node.id)}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px' }}>{t('new_chain_title', { defaultValue: 'Yeni Görev Zinciri' })}</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className={styles.stepInput}
                  placeholder="Zincir Başlığı (Örn: TYT Matematik Soru Çözümü)"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({...templateForm, title: e.target.value})}
                  required
                />
                
                <input
                  type="text"
                  className={styles.stepInput}
                  placeholder="Açıklama (İsteğe bağlı)"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                />
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                        className={styles.stepInput}
                        value={templateForm.taskType}
                        onChange={(e) => setTemplateForm({...templateForm, taskType: e.target.value})}
                    >
                        <option value="Soru Çözme">Soru Çözme</option>
                        <option value="Konu Çalışması">Konu Çalışması</option>
                        <option value="Deneme">Deneme</option>
                        <option value="Okuma">Okuma</option>
                        <option value="Default">Diğer</option>
                    </select>
                    <input
                      type="number"
                      className={styles.stepInput}
                      placeholder="Hedef Soru/Sayfa Sayısı (İsteğe bağlı)"
                      value={templateForm.targetCount}
                      onChange={(e) => setTemplateForm({...templateForm, targetCount: e.target.value})}
                    />
                </div>
                
                <select 
                    className={styles.stepInput}
                    value={templateForm.recurrenceType}
                    onChange={(e) => setTemplateForm({...templateForm, recurrenceType: e.target.value})}
                >
                    <option value="Daily">{t('recurrence_daily', { defaultValue: 'Her Gün' })}</option>
                    <option value="Weekly">{t('recurrence_weekly', { defaultValue: 'Haftanın Belirli Günleri' })}</option>
                    <option value="Custom">{t('recurrence_custom', { defaultValue: 'Özel Tarihler' })}</option>
                </select>
                
                {templateForm.recurrenceType === 'Weekly' && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {[
                          { val: 1, label: 'Pzt' }, { val: 2, label: 'Sal' }, { val: 3, label: 'Çar' },
                          { val: 4, label: 'Per' }, { val: 5, label: 'Cum' }, { val: 6, label: 'Cmt' }, { val: 0, label: 'Paz' }
                        ].map(day => (
                            <label key={day.val} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--surface-sunken)', padding: '4px 8px', borderRadius: '4px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={templateForm.daysOfWeek.includes(day.val)}
                                  onChange={() => toggleDayOfWeek(day.val)}
                                />
                                {day.label}
                            </label>
                        ))}
                    </div>
                )}
                
                {templateForm.recurrenceType === 'Custom' && (
                    <div style={{ background: 'var(--surface-sunken)', padding: '8px', borderRadius: '8px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                {t('custom_dates_helper', { defaultValue: 'Tarih seçip ekleyin (En fazla 30 tarih)' })}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: templateForm.customDates.length >= 30 ? '#ef4444' : 'var(--text2)' }}>
                                {templateForm.customDates.length} / 30
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input 
                              type="date" 
                              className={styles.stepDateInput}
                              value={customDateInput}
                              disabled={templateForm.customDates.length >= 30}
                              onChange={(e) => setCustomDateInput(e.target.value)}
                            />
                            <button 
                              type="button" 
                              className={styles.secondaryBtn} 
                              onClick={addCustomDate}
                              disabled={templateForm.customDates.length >= 30}
                            >
                              {t('btn_add_date', { defaultValue: 'Tarih Ekle' })}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {templateForm.customDates.map(d => (
                                <span key={d} style={{ fontSize: '12px', background: 'var(--surface-raised)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {new Date(d).toLocaleDateString()}
                                    <button type="button" onClick={() => removeCustomDate(d)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {templateForm.recurrenceType !== 'Custom' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text3)' }}>{t('start_date', { defaultValue: 'Başlangıç Tarihi' })}</label>
                            <input
                              type="date"
                              className={styles.stepDateInput}
                              value={templateForm.startDate}
                              onChange={(e) => setTemplateForm({...templateForm, startDate: e.target.value})}
                              required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text3)' }}>{t('end_date_optional', { defaultValue: 'Bitiş Tarihi (İsteğe bağlı)' })}</label>
                            <input
                              type="date"
                              className={styles.stepDateInput}
                              value={templateForm.endDate}
                              onChange={(e) => setTemplateForm({...templateForm, endDate: e.target.value})}
                            />
                        </div>
                    </div>
                )}

              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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

  const uncategorizedChains = chains.filter(c => !c.categoryId);

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
                  return (
                    <div key={chain.id} className={styles.chainCard}>
                      <div 
                        className={styles.chainCardHeader} 
                        onClick={() => toggleChain(chain.id)}
                      >
                        <div style={{ flex: 1 }}>
                          <div className={styles.chainTitle}>
                            🔗 {chain.title}
                          </div>
                          <div className={styles.chainMeta}>
                            Tekrar: {chain.recurrenceType === 'Daily' ? 'Her Gün' : chain.recurrenceType === 'Weekly' ? 'Belirli Günler' : 'Özel Tarihler'}
                          </div>
                        </div>
                        <button className={styles.deleteBtn} onClick={(e) => handleDeleteChain(chain.id, e)}>🗑</button>
                        <div className={`${styles.chevron} ${expandedChainId === chain.id ? styles.chevronOpen : ''}`}>
                          ▼
                        </div>
                      </div>

                      {expandedChainId === chain.id && (
                        <div className={styles.taskList} style={{ padding: '12px' }}>
                           <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
                               <strong>Açıklama:</strong> {chain.description || 'Yok'}<br/>
                               <strong>Başlangıç:</strong> {chain.startDate ? new Date(chain.startDate).toLocaleDateString() : 'Yok'}<br/>
                               <strong>Bitiş:</strong> {chain.endDate ? new Date(chain.endDate).toLocaleDateString() : 'Yok'}<br/>
                               <strong>Son Üretim:</strong> {chain.lastGeneratedDate ? new Date(chain.lastGeneratedDate).toLocaleDateString() : 'Yok'}
                           </div>
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
