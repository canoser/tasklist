import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FilterDropdown.module.css';

const FilterDropdown = ({ roles = [], categories = [], chains = [], filter, onFilterChange, onToggle, tone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const { t } = useTranslation('common');
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = (id) => {
    const currentRoles = filter.roleIds || [];
    const newRoles = currentRoles.includes(id) 
      ? currentRoles.filter(r => r !== id)
      : [...currentRoles, id];
    onFilterChange({ ...filter, roleIds: newRoles });
  };

  const handleSelectCategory = (id) => {
    const currentCats = filter.categoryIds || [];
    const newCats = currentCats.includes(id) 
      ? currentCats.filter(c => c !== id)
      : [...currentCats, id];
    onFilterChange({ ...filter, categoryIds: newCats });
  };

  const handleSelectChain = (id) => {
    const currentChains = filter.chainIds || [];
    const newChains = currentChains.includes(id) 
      ? currentChains.filter(c => c !== id)
      : [...currentChains, id];
    onFilterChange({ ...filter, chainIds: newChains });
  };

  const handleClear = () => {
    onFilterChange({ roleIds: [], categoryIds: [], chainIds: [] });
    setActiveMenu(null);
    setIsOpen(false);
    if (onToggle) onToggle(false);
  };

  const isAll = (!filter.roleIds || filter.roleIds.length === 0) 
             && (!filter.categoryIds || filter.categoryIds.length === 0)
             && (!filter.chainIds || filter.chainIds.length === 0);

  return (
    <div className={styles.container} ref={containerRef}>
      {!isOpen ? (
        <button type="button" className={styles.mainBtn} onClick={() => { setIsOpen(true); if (onToggle) onToggle(true); }}>
          {t('filters', { context: tone })} {(!isAll) ? `(${t('filter_active', { context: tone })})` : ''}
        </button>
      ) : (
        <div className={styles.expandedStrip}>
          <button type="button" className={styles.closeBtn} onClick={() => { setIsOpen(false); setActiveMenu(null); if (onToggle) onToggle(false); }}>
            ✕ {t('btn_close', { context: tone })}
          </button>
          
          <button 
            type="button"
            className={`${styles.filterBtn} ${isAll ? styles.activeFilterBtn : ''}`}
            onClick={handleClear}
          >
            {t('filter_all', { context: tone })}
          </button>

          {/* Rol Filtresi */}
          {roles.length > 0 && (
            <div className={styles.relative}>
              <button 
                type="button"
                className={`${styles.filterBtn} ${(filter.roleIds && filter.roleIds.length > 0) ? styles.activeFilterBtn : ''}`} 
                onClick={() => setActiveMenu(activeMenu === 'role' ? null : 'role')}
              >
                {t('filter_role', { context: tone })} {(filter.roleIds && filter.roleIds.length > 0) ? `(${filter.roleIds.length})` : ''}
              </button>
              {activeMenu === 'role' && (
                <div className={styles.dropdown}>
                  {roles.map(r => {
                    const isSelected = filter.roleIds && filter.roleIds.includes(r.id);
                    return (
                      <div 
                        key={`role-${r.id}`} 
                        className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                        onClick={() => handleSelectRole(r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <input type="checkbox" checked={isSelected} readOnly style={{ margin: 0, cursor: 'pointer' }} />
                        {r.name || r.roleName}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Kategori Filtresi */}
          <div className={styles.relative}>
            <button 
              type="button"
              className={`${styles.filterBtn} ${(filter.categoryIds && filter.categoryIds.length > 0) ? styles.activeFilterBtn : ''}`} 
              onClick={() => setActiveMenu(activeMenu === 'category' ? null : 'category')}
            >
              {t('filter_category', { context: tone })} {(filter.categoryIds && filter.categoryIds.length > 0) ? `(${filter.categoryIds.length})` : ''}
            </button>
            {activeMenu === 'category' && (
              <div className={styles.dropdown}>
                {categories.length === 0 ? <div className={styles.empty}>{t('filter_no_category', { context: tone })}</div> : null}
                {categories.map(c => {
                  const isSelected = filter.categoryIds && filter.categoryIds.includes(c.id);
                  return (
                    <div 
                      key={`cat-${c.id}`} 
                      className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handleSelectCategory(c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ margin: 0, cursor: 'pointer' }} />
                      {c.name}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Zincir Görev Filtresi */}
          <div className={styles.relative}>
            <button 
              type="button"
              className={`${styles.filterBtn} ${(filter.chainIds && filter.chainIds.length > 0) ? styles.activeFilterBtn : ''}`} 
              onClick={() => setActiveMenu(activeMenu === 'chain' ? null : 'chain')}
            >
              {t('filter_chain', { context: tone })} {(filter.chainIds && filter.chainIds.length > 0) ? `(${filter.chainIds.length})` : ''}
            </button>
            {activeMenu === 'chain' && (
              <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                {chains.length === 0 ? <div className={styles.empty}>{t('filter_no_chain', { context: tone })}</div> : null}
                {chains.map(ch => {
                  const isSelected = filter.chainIds && filter.chainIds.includes(ch.chainId);
                  // Zincir adını ilk görevin başlığından türetelim veya chainId'yi gösterelim
                  const chainSuffix = ` (${t('filter_chain_suffix', { context: tone })})`;
                  const chainName = ch.tasks && ch.tasks.length > 0 ? ch.tasks[0].title + chainSuffix : ch.chainId;
                  return (
                    <div 
                      key={`chain-${ch.chainId}`} 
                      className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handleSelectChain(ch.chainId)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ margin: 0, cursor: 'pointer' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                        {chainName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
