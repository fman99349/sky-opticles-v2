import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../auth/AuthContext';
import { updatePushToken } from '../utils/api'; // Assuming you have this, or use the endpoint directly

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
  const { token, user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || !token) return;

    registerForPushNotificationsAsync().then(async (pushToken) => {
      if (pushToken) {
        setExpoPushToken(pushToken);
        try {
          // Send the token to your backend so it can send push notifications
          await fetch('https://reprimand-oxidation-atlas.ngrok-free.dev/api/auth/push-token', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ pushToken }),
          });
          console.log('✅ Push token registered with backend:', pushToken);
        } catch (e) {
          console.warn('Failed to save push token to backend:', e);
        }
      }
    });
  }, [user, token]);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notifications, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

async function registerForPushNotificationsAsync() {
  let pushToken;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    // This line will now work because google-services.json is present
    pushToken = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return pushToken;
}

export function useNotifications() {
  return useContext(NotificationContext);
}