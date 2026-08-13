import { useState, useEffect } from 'react';

export const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    // Initial check
    const mql = window.matchMedia('(orientation: landscape)');
    setIsLandscape(mql.matches);

    // Event listener
    const handler = (e) => setIsLandscape(e.matches);
    
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
    } else {
      mql.addListener(handler);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler);
      } else {
        mql.removeListener(handler);
      }
    };
  }, []);

  return isLandscape;
};
