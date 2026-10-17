import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';

const ROLE_LABEL = { Student: 'Öğrenci', Teacher: 'Öğretmen', Parent: 'Veli' };

export default function ViewAsBanner() {
  const { viewAs, setViewAs } = useAuthStore();
  const navigate = useNavigate();

  if (!viewAs) return null;

  const handleExit = () => {
    setViewAs(null);
    navigate('/coach/dashboard');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(245, 158, 11, 0.97)',
        color: '#1f2937',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.85rem',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <span>
        👁️ Gözüyle Gör Modu Aktif: {ROLE_LABEL[viewAs.role] || viewAs.role} — {viewAs.name} (Salt-Okunur Önizleme)
      </span>
      <button
        onClick={handleExit}
        style={{
          background: '#1f2937',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 10px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Önizlemeden Çık ✕
      </button>
    </div>
  );
}
