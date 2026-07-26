import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const UndoContext = createContext();

export const useUndo = () => useContext(UndoContext);

export const UndoProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({ isOpen: false, message: '', onUndo: null });
  const timerRef = useRef(null);
  const commitActionRef = useRef(null); // API'ye gidecek asıl fonksiyon

  const triggerUndoableAction = useCallback((message, optimisticUpdate, commitAction, rollbackAction, duration = 5000) => {
    // 1. Arayüzü anında güncelle (Optimistic UI)
    optimisticUpdate();

    // 2. Önceki zamanlayıcıyı ve commit'i iptal et (eğer üst üste iki işlem yapılırsa)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (commitActionRef.current) commitActionRef.current(); // Bekleyen önceki işlemi commit et
    }

    commitActionRef.current = commitAction;

    // 3. Snackbar'ı göster
    setSnackbar({
      isOpen: true,
      message,
      onUndo: () => {
        // Geri al'a basıldı
        clearTimeout(timerRef.current);
        timerRef.current = null;
        commitActionRef.current = null;
        setSnackbar({ isOpen: false, message: '', onUndo: null });
        rollbackAction(); // Eski haline döndür
      }
    });

    // 4. Zamanlayıcıyı başlat (Geri alınmazsa kalıcı yap)
    timerRef.current = setTimeout(() => {
      setSnackbar({ isOpen: false, message: '', onUndo: null });
      if (commitActionRef.current) {
        commitActionRef.current(); // Kalıcı olarak kaydet (API'ye gönder)
        commitActionRef.current = null;
      }
    }, duration);
  }, []);

  return (
    <UndoContext.Provider value={{ triggerUndoableAction }}>
      {children}
      {/* ── Undo Snackbar Bileşeni ── */}
      <AnimatePresence>
        {snackbar.isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1f2937',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 9999,
              minWidth: '300px',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{snackbar.message}</span>
            <button
              onClick={snackbar.onUndo}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60a5fa',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                padding: '4px 8px'
              }}
            >
              Geri Al
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </UndoContext.Provider>
  );
};
