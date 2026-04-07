export const POINTS = {
  WELCOME: 200,
  REFERRAL: 100,
  ORDER_REWARD_PCT: 2,           // 2% of order total
  POINTS_TO_INR: 0.1,            // 1 point = ₹0.10
};

export const OTP = {
  LENGTH: 6,
  EXPIRES_MINUTES: 10,
  MAX_ATTEMPTS: 5,
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const ORDER_STATUS = {
  PLACED: 'placed',
  PAID: 'paid',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const VENDOR_STATUS = {
  PENDING: 'pending',
  LEVEL1: 'level1_approved',
  LEVEL2: 'level2_approved',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export const CACHE_TTL = {
  SHORT: 60,          // 1 min
  MEDIUM: 300,        // 5 min
  LONG: 3600,         // 1 hour
  DAY: 86400,         // 1 day
};

export const UPLOAD = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,   // 5 MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
};
