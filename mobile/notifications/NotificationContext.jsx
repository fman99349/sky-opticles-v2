import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../auth/AuthContext';
import { API_URL } from '../utils/api';

// Configure how notifications are shown when the app is in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Silent — may already be registered
}

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: false,
  expoPushToken: null,
  markAllAsRead: async () => {},
  removeNotification: async () => {},
  clearAll: async () => {},
  refresh: async () => {},
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.warn('[notifications] Channel setup failed:', e.message);
    }
  }

  if (!Device.isDevice) {
    console.warn('[notifications] Push requires a physical device');
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[notifications] Permission denied');
      return null;
    }
    const result = await Notifications.getExpoPushTokenAsync();
    return result.data;
  } catch (e) {
    console.warn('[notifications] Token fetch failed:', e.message);
    return null;
  }
}

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setNotifications(json.data || []);
    } catch (e) {
      console.warn('[notifications] Load failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch notifications whenever a user is signed in
  useEffect(() => {
    if (user && token) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, token, fetchNotifications]);

  // Register push token on sign-in
  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;

    (async () => {
      const pushToken = await registerForPushNotificationsAsync();
      if (cancelled || !pushToken) return;
      setExpoPushToken(pushToken);
      try {
        await fetch(`${API_URL}/auth/push-token`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pushToken }),
        });
        console.log('[notifications] Push token saved:', pushToken);
      } catch (e) {
        console.warn('[notifications] Save token failed:', e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [user, token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    // Optimistic — mark all locally, then tell the server
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('[notifications] Mark all read failed:', e.message);
    }
  }, [token]);

  const removeNotification = useCallback(async (id) => {
    if (!token) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('[notifications] Delete failed:', e.message);
    }
  }, [token]);

  const clearAll = useCallback(async () => {
    if (!token) return;
    setNotifications([]);
    try {
      await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('[notifications] Clear all failed:', e.message);
    }
  }, [token]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value = {
    notifications,
    unreadCount,
    loading,
    expoPushToken,
    markAllAsRead,
    removeNotification,
    clearAll,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}