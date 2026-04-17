/**
 * Non-secret Backblaze B2 defaults for this project.
 * Override via env: B2_BUCKET, B2_S3_ENDPOINT, B2_REGION.
 * Secrets (B2_APPLICATION_KEY_*) and B2_PUBLIC_URL_BASE must always come from .env — never commit them.
 */
export const DEFAULT_B2_BUCKET = 'planext4u';
export const DEFAULT_B2_S3_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
export const DEFAULT_B2_REGION = 'us-east-005';
