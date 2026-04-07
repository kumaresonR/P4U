import admin from 'firebase-admin';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export const initFirebase = () => {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase credentials not configured — push notifications & phone OTP disabled');
    return;
  }
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  logger.info('Firebase Admin initialized');
};

// ─── Phone OTP Verification ──────────────────────────────────────────────────
// Flow: Client uses Firebase SDK to send OTP → gets idToken → sends to backend
// Backend verifies idToken and extracts phone number

export const verifyFirebaseToken = async (idToken: string): Promise<{ phone: string; uid: string }> => {
  if (!firebaseApp) throw new Error('Firebase not initialized');
  const decoded = await admin.auth().verifyIdToken(idToken);
  const phone = decoded.phone_number;
  if (!phone) throw new Error('Firebase token does not contain a phone number');
  return { phone, uid: decoded.uid };
};

// ─── Push Notifications ───────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export const sendPushToToken = async (token: string, payload: PushPayload): Promise<void> => {
  if (!firebaseApp) return;
  try {
    await admin.messaging().send({
      token,
      notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
      data: payload.data,
      android: { priority: 'high', notification: { sound: 'default', channelId: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err) {
    logger.error({ err, token }, 'FCM send failed');
  }
};

export const sendPushToTokens = async (tokens: string[], payload: PushPayload): Promise<void> => {
  if (!firebaseApp || tokens.length === 0) return;
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));
  for (const chunk of chunks) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
        data: payload.data,
        android: { priority: 'high', notification: { sound: 'default', channelId: 'default' } },
      });
    } catch (err) {
      logger.error({ err }, 'FCM multicast failed');
    }
  }
};

export const sendPushToTopic = async (topic: string, payload: PushPayload): Promise<void> => {
  if (!firebaseApp) return;
  try {
    await admin.messaging().send({
      topic,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    });
  } catch (err) {
    logger.error({ err, topic }, 'FCM topic send failed');
  }
};
