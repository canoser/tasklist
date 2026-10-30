import React from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './SegmentedTabs.module.css';

export default function SegmentedTabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'segmented',
  size = 'md',
  fullWidth = false,
  urlParam,
  defaultTab,
  className = '',
  style,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const resolvedActiveTab =
    activeTab !== undefined
      ? activeTab
      : urlParam
        ? searchParams.get(urlParam) || defaultTab || tabs[0]?.id
        : defaultTab || tabs[0]?.id;

  const handleSelect = (tabId) => {
    if (urlParam) {
      const nextParams = new URLSearchParams(searchParams);
      const fallback = defaultTab || tabs[0]?.id;
      if (tabId && tabId !== fallback) {
        nextParams.set(urlParam, tabId);
      } else {
        nextParams.delete(urlParam);
      }
      setSearchParams(nextParams, { replace: true });
    }
    if (onChange) {
      onChange(tabId);
    }
  };

  const containerClasses = [
    styles.container,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} style={style} role="tablist">
      {tabs.map((tab) => {
        if (!tab) return null;
        const isActive = resolvedActiveTab === tab.id;
        const btnClasses = [
          styles.tabBtn,
          isActive ? styles.active : '',
          fullWidth ? styles.tabFullWidth : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            className={btnClasses}
            onClick={() => handleSelect(tab.id)}
          >
            {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span className={`${styles.badge} ${isActive ? styles.badgeActive : ''}`}>
                {tab.count}
              </span>
            )}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}

