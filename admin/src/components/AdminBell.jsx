import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api/client.js';

export default function AdminBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.listAdminNotifications();
      setNotifications(res.data || []);
    } catch (e) {
      console.error("FAILED TO FETCH ADMIN NOTIFICATIONS:", e);
    }
  };

  // Poll every 15 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    
    // Always fetch fresh data when clicking the bell
    await fetchNotifications();

    if (nextOpen && unreadCount > 0) {
      // Mark all as read when opening
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try {
        await api.markAllAdminNotificationsRead();
      } catch (e) {}
    }
  };

  return (
    <div className="admin-bell-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={handleOpen}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="admin-bell-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="admin-bell-dropdown">
          <div className="admin-bell-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button
                className="admin-bell-clear"
                onClick={() => {
                  setNotifications([]);
                  // We don't have a delete endpoint for admin, but this hides them locally
                }}
              >
                Clear UI
              </button>
            )}
          </div>

          <div className="admin-bell-list">
            {notifications.length === 0 ? (
              <div className="admin-bell-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`admin-bell-item ${!n.is_read ? 'unread' : ''}`}
                >
                  <div className="admin-bell-item-title">{n.title}</div>
                  <div className="admin-bell-item-msg">{n.message}</div>
                  <div className="admin-bell-item-time">
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}