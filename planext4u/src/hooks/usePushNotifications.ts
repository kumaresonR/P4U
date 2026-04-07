import { useEffect } from 'react';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { api as http } from '@/lib/apiClient';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/lib/auth';

export const usePushNotifications = () => {
  const { customerUser } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const setupPushNotifications = async () => {
      // Push notifications are generally native-only for Capacitor
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Request permissions
        const permission = await FirebaseMessaging.requestPermissions();
        if (permission.receive !== 'granted') {
          console.warn('Push notification permissions denied');
          return;
        }

        // Get the token
        const { token } = await FirebaseMessaging.getToken();
        console.log('Firebase Cloud Messaging Token:', token);

        // If we have a logged-in user, store the token via the backend
        if (customerUser?.id && token && isMounted) {
          await http.post('/auth/fcm-token', { token }).catch((err) => {
            console.error('Error saving FCM token:', err);
          });
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    // Firebase messaging event listeners
    const addListeners = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      await FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('Push notification received', event);
      });

      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Push notification action performed', event);
      });
    };

    setupPushNotifications();
    addListeners();

    return () => {
      isMounted = false;
      if (Capacitor.isNativePlatform()) {
        FirebaseMessaging.removeAllListeners();
      }
    };
  }, [customerUser]);

};
