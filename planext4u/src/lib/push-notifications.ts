import { isNativePlatform } from "@/lib/capacitor";
import { api } from "@/lib/apiClient";

/**
 * Push notification service for Capacitor Android app.
 * Handles FCM token registration, notification listeners, and deep linking.
 */

let initialized = false;

export async function initPushNotifications(userId?: string) {
  if (!isNativePlatform() || initialized) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") {
      console.warn("Push notification permission denied");
      return;
    }

    // Register with FCM
    await PushNotifications.register();

    // Listen for token
    PushNotifications.addListener("registration", async (token) => {
      console.log("FCM Token:", token.value);
      if (userId) {
        await savePushToken(userId, token.value);
      }
      // Store locally for later use
      localStorage.setItem("p4u_push_token", token.value);
    });

    // Registration error
    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err);
    });

    // Notification received while app is in foreground
    PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      console.log("Push notification received:", notification);
      // Show in-app notification using dynamic import
      const { toast } = await import("sonner");
      toast(notification.title || "Notification", {
        description: notification.body || "",
      });
    });

    // Notification clicked (foreground, background, or killed state)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push notification action:", action);
      const data = action.notification.data;
      if (data?.deep_link) {
        // Navigate to the deep link path
        window.location.href = data.deep_link;
      } else if (data?.route) {
        window.location.href = data.route;
      }
    });

    initialized = true;
  } catch (err) {
    console.error("Failed to init push notifications:", err);
  }
}

async function savePushToken(_userId: string, token: string) {
  try {
    await api.post('/auth/fcm-token', { fcm_token: token });
  } catch (err) {
    console.error("Error saving push token:", err);
  }
}

/**
 * Update push token when user logs in (link token to user)
 */
export async function linkPushTokenToUser(userId: string) {
  const token = localStorage.getItem("p4u_push_token");
  if (token) {
    await savePushToken(userId, token);
  }
}

/**
 * Clear push token on logout
 */
export async function clearPushToken(_userId: string) {
  // Token is cleared server-side on logout
}
