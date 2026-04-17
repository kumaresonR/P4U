import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDfQ-0baPOXaa31xnQXranIIwvHC2zbmiE",
  authDomain: "p4u-console.firebaseapp.com",
  projectId: "p4u-console",
  storageBucket: "p4u-console.appspot.com",
  messagingSenderId: "784503032650",
  appId: "1:784503032650:web:8c3d03418db7d594028fb3",
  measurementId: "G-RX9CW0VKL0",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

// Use custom domain for auth to avoid third-party cookie issues
firebaseAuth.useDeviceLanguage();

const STATIC_ALLOWED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "planext4u.com",
  "www.planext4u.com",
  "www.planext4u.net",
  "planext4u.net",
]);

/** Canonical web origin for Firebase Phone Auth redirects (matches production API host). */
function getProductionOrigin(): string {
  const api = import.meta.env.VITE_API_URL as string | undefined;
  if (api && /^https?:\/\//i.test(api)) {
    try {
      return new URL(api).origin;
    } catch {
      // fall through
    }
  }
  return "https://planext4u.com";
}

const PRODUCTION_URL = getProductionOrigin();

function isAllowedHostname(host: string): boolean {
  return STATIC_ALLOWED_HOSTNAMES.has(host);
}

function getAuthorizedFirebaseUrl(): string {
  return `${PRODUCTION_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToAuthorizedHost(target: string) {
  if (window.self !== window.top) {
    try {
      window.open(target, "_top");
      return;
    } catch {
      // fall through to same-frame navigation
    }
  }

  window.location.replace(target);
}

/**
 * Check if Firebase Phone Auth is supported on the current hostname.
 * If not, redirect the user to the production domain preserving the path.
 * Returns true if the current host is allowed, false if redirecting.
 */
export function ensureFirebaseHostname(): boolean {
  const host = window.location.hostname;
  if (isAllowedHostname(host)) return true;

  const target = getAuthorizedFirebaseUrl();
  console.warn(`Firebase Phone Auth blocked on host: ${host}. Redirecting to ${PRODUCTION_URL}.`);
  redirectToAuthorizedHost(target);
  return false;
}

let confirmationResultGlobal: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

function getOrCreateRecaptchaContainer(): HTMLElement {
  const existing = document.getElementById("recaptcha-container");
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = "recaptcha-container";
  document.body.appendChild(el);
  return el;
}

export function setupRecaptcha(): RecaptchaVerifier {
  if (!isAllowedHostname(window.location.hostname)) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  // Clean up any existing verifier
  clearRecaptcha();

  // Create fresh container
  getOrCreateRecaptchaContainer();

  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
    size: "invisible",
    callback: () => {
      console.log("reCAPTCHA solved");
    },
    "expired-callback": () => {
      console.log("reCAPTCHA expired");
    },
  });

  return recaptchaVerifier;
}

/**
 * Pre-render reCAPTCHA so it's ready when user clicks "Send OTP".
 * Call this on page mount.
 */
export function preRenderRecaptcha() {
  // Skip pre-rendering — we create fresh verifier on each sendOTP call
}

export async function sendOTP(phoneNumber: string) {
  if (!ensureFirebaseHostname()) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  const currentPhone = firebaseAuth.currentUser?.phoneNumber?.replace(/\s/g, "");
  if (firebaseAuth.currentUser && currentPhone !== phoneNumber.replace(/\s/g, "")) {
    await signOut(firebaseAuth).catch(() => undefined);
  }

  // Create fresh verifier
  const verifier = setupRecaptcha();

  try {
    const result = await signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);
    confirmationResultGlobal = result;
    return result;
  } catch (err) {
    // Clean up on failure so next attempt starts fresh
    clearRecaptcha();
    throw err;
  }
}

export async function verifyOTP(otp: string) {
  if (!confirmationResultGlobal) {
    throw new Error("Please send OTP first");
  }
  const result = await confirmationResultGlobal.confirm(otp);
  return result.user;
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("No Firebase user signed in");
  // Don't force refresh — the token from verifyOTP() is already fresh.
  // Forcing refresh (true) makes an extra network call to Google that can
  // fail on localhost with "Failed to fetch".
  return user.getIdToken(false);
}

export async function resetPhoneAuth() {
  confirmationResultGlobal = null;
  clearRecaptcha();
  if (firebaseAuth.currentUser) {
    await signOut(firebaseAuth).catch(() => undefined);
  }
}

export function clearRecaptcha() {
  confirmationResultGlobal = null;
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }
  const el = document.getElementById("recaptcha-container");
  if (el) el.remove();
}
