import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBs9GdBSEK8BGjeGypEOjiHF_jkToy-Qlk",
  authDomain: "planext4u-ba50f.firebaseapp.com",
  projectId: "planext4u-ba50f",
  storageBucket: "planext4u-ba50f.firebasestorage.app",
  messagingSenderId: "924127717306",
  appId: "1:924127717306:web:43541de9fce52be5dd1f83",
  measurementId: "G-BVQFEKX1ZL",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

// Use custom domain for auth to avoid third-party cookie issues
firebaseAuth.useDeviceLanguage();

const ALLOWED_HOSTNAMES = ["localhost", "127.0.0.1", "planext4u.lovable.app", "www.planext4u.net", "planext4u.net"];

function isAllowedHostname(host: string): boolean {
  return ALLOWED_HOSTNAMES.includes(host);
}
const PRODUCTION_URL = "https://planext4u.lovable.app";

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
  return user.getIdToken(true);
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
