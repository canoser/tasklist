import { useState, useEffect } from 'react';

export const useDevice = () => {
  const [isWideScreen, setIsWideScreen] = useState(false);

  useEffect(() => {
    // Check if device is desktop or a horizontal tablet
    // min-width 1024px represents standard desktop/laptop.
    // min-width 768px and orientation landscape represents a tablet in horizontal mode.
    const query = '(min-width: 1024px), (min-width: 768px) and (orientation: landscape)';
    const mql = window.matchMedia(query);
    
    setIsWideScreen(mql.matches);

    const handler = (e) => setIsWideScreen(e.matches);
    
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
    } else {
      mql.addListener(handler); // fallback for older browsers
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler);
      } else {
        mql.removeListener(handler);
      }
    };
  }, []);

  return { isWideScreen };
};
