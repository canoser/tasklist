import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '../../../hooks/useNotifications';
import { Bell, FileText, Shield, GraduationCap, BookOpen, Calendar, Layers } from 'lucide-react';
import styles from './NotificationDropdown.module.css';

const timeAgo = (dateStr) => {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
};

const typeIcon = (type) => {
  if (type?.startsWith('HOMEWORK')) return <FileText size={16} strokeWidth={1.75} />;
  if (type?.includes('COACH')) return <Shield size={16} strokeWidth={1.75} />;
  if (type?.includes('TEACHER')) return <GraduationCap size={16} strokeWidth={1.75} />;
  if (type?.includes('RESOURCE')) return <BookOpen size={16} strokeWidth={1.75} />;
  if (type?.includes('SCHEDULE')) return <Calendar size={16} strokeWidth={1.75} />;
  if (type?.includes('PROGRAM')) return <Layers size={16} strokeWidth={1.75} />;
  return <Bell size={16} strokeWidth={1.75} />;
};

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();

  const unreadCount = notifications?.filter((n) => !n.isRead)?.length || 0;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n) => {
    markRead.mutate(n.id);
    const t = n.type || '';
    const role = user?.role;
    if (t.startsWith('HOMEWORK')) {
      navigate(role === 'Student' ? '/student/homework' : '/coach/students');
    } else if (t.includes('PROGRAM') || t.includes('COACH') || t.includes('TEACHER')) {
      navigate('/coach/programs');
    } else if (t.includes('SCHEDULE')) {
      navigate(role === 'Student' ? '/student/schedule' : '/coach/calendar');
    } else {
      navigate(role === 'Student' ? '/student/home' : '/coach/calendar');
    }
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button 
        type="button" 
        className={styles.bell} 
        onClick={() => setOpen((o) => !o)} 
        title="Bildirimler"
        aria-label="Bildirimler"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Bildirimler</span>
            {unreadCount > 0 && (
              <button type="button" className={styles.markAll} onClick={() => markAllRead.mutate()}>
                Tümünü okundu yap
              </button>
            )}
          </div>
          <div className={styles.list}>
            {notifications && notifications.length > 0 ? (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <span className={styles.icon}>{typeIcon(n.type)}</span>
                  <div className={styles.body}>
                    <div className={styles.title}>{n.title}</div>
                    <div className={styles.text}>{n.body}</div>
                    <div className={styles.time}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <span className={styles.dot} />}
                </button>
              ))
            ) : (
              <div className={styles.empty}>Bildirim yok.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
