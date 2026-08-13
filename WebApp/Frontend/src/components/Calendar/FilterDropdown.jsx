import React, { useState, useRef, useEffect } from 'react';
import styles from './FilterDropdown.module.css';

const FilterDropdown = ({ roles = [], categories = [], chains = [], filter, onFilterChange, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  
  const containerRef = useRef(null);

  useEffect(() => {
    if (onToggle) onToggle(isOpen);
  }, [isOpen, onToggle]);

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
  };

  const isAll = (!filter.roleIds || filter.roleIds.length === 0) 
             && (!filter.categoryIds || filter.categoryIds.length === 0)
             && (!filter.chainIds || filter.chainIds.length === 0);

  return (
    <div className={styles.container} ref={containerRef}>
      {!isOpen ? (
        <button className={styles.mainBtn} onClick={() => setIsOpen(true)}>
          Filtreler {(!isAll) ? '(Aktif)' : ''}
        </button>
      ) : (
        <div className={styles.expandedStrip}>
          <button className={styles.closeBtn} onClick={() => { setIsOpen(false); setActiveMenu(null); }}>
            ✕ Kapat
          </button>
          
          <button 
            className={`${styles.filterBtn} ${isAll ? styles.activeFilterBtn : ''}`}
            onClick={handleClear}
          >
            Tümü
          </button>

          {/* Rol Filtresi */}
          {roles.length > 0 && (
            <div className={styles.relative}>
              <button 
                className={`${styles.filterBtn} ${(filter.roleIds && filter.roleIds.length > 0) ? styles.activeFilterBtn : ''}`} 
                onClick={() => setActiveMenu(activeMenu === 'role' ? null : 'role')}
              >
                Rol {(filter.roleIds && filter.roleIds.length > 0) ? `(${filter.roleIds.length})` : ''}
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
              className={`${styles.filterBtn} ${(filter.categoryIds && filter.categoryIds.length > 0) ? styles.activeFilterBtn : ''}`} 
              onClick={() => setActiveMenu(activeMenu === 'category' ? null : 'category')}
            >
              Kategori {(filter.categoryIds && filter.categoryIds.length > 0) ? `(${filter.categoryIds.length})` : ''}
            </button>
            {activeMenu === 'category' && (
              <div className={styles.dropdown}>
                {categories.length === 0 ? <div className={styles.empty}>Kategori bulunamadı</div> : null}
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
              className={`${styles.filterBtn} ${(filter.chainIds && filter.chainIds.length > 0) ? styles.activeFilterBtn : ''}`} 
              onClick={() => setActiveMenu(activeMenu === 'chain' ? null : 'chain')}
            >
              Zincir {(filter.chainIds && filter.chainIds.length > 0) ? `(${filter.chainIds.length})` : ''}
            </button>
            {activeMenu === 'chain' && (
              <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                {chains.length === 0 ? <div className={styles.empty}>Zincir bulunamadı</div> : null}
                {chains.map(ch => {
                  const isSelected = filter.chainIds && filter.chainIds.includes(ch.chainId);
                  // Zincir adını ilk görevin başlığından türetelim veya chainId'yi gösterelim
                  const chainName = ch.tasks && ch.tasks.length > 0 ? ch.tasks[0].title + ' (Zincir)' : ch.chainId;
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
