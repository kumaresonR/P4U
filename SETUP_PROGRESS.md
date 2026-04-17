# Planext4U — Setup & Migration Progress

This document tracks all configuration, fixes, and migration work completed for moving the recreated Planext4U project to production.

---

## 1. Hostinger VPS Deployment Setup (Pending VPS Access)

Created production-ready Docker-based deployment configs.

### Files Created
| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | Production stack: Nginx + Backend + PostgreSQL + Redis + Certbot (SSL) |
| `nginx/nginx.conf` | Nginx main config (gzip, logging) |
| `nginx/conf.d/default.conf` | Site config (HTTPS, SPA routing, API reverse proxy, Socket.IO) |
| `nginx/conf.d/initial.conf.bak` | First-time HTTP-only config for SSL certificate bootstrap |
| `.env` | Docker Compose env (POSTGRES_PASSWORD, REDIS_PASSWORD) |
| `planext4u-backend/.env.production` | Backend production env template |
| `deploy.sh` | One-shot deployment script for Hostinger VPS |
| `.gitignore` | Excludes secrets and build artifacts |

### How To Deploy When VPS Is Ready
1. Get a Hostinger VPS (KVM 2 minimum, Ubuntu 22.04)
2. Fill in real secrets in `.env` and `planext4u-backend/.env.production`
3. Point domain DNS to VPS IP
4. SSH in, clone repo to `/opt/planext4u`
5. Run `./deploy.sh` — installs Docker, builds frontend, gets SSL cert, starts all services, runs Prisma migrations

---

## 2. Android Apps — Play Store Update Configuration

Both apps configured to publish as updates to the existing Play Store listings using the same signing keys.

### App IDs (must match Play Store)
| App | applicationId | Current versionCode | Current versionName |
|---|---|---|---|
| Customer | `com.p4u_customer` | 78 | 5.34 |
| Vendor | `com.p4u.p4u_vendor` | 53 | 2.25 |

### Files Modified
- `planext4u/android/app/build.gradle` — applicationId, versionCode, signing config
- `planext4u/android-vendor/app/build.gradle` — same for vendor
- `planext4u/capacitor.config.ts` — appId
- `planext4u/capacitor.config.customer.ts` — appId
- `planext4u/capacitor.config.vendor.ts` — appId
- `planext4u/android/app/src/main/res/values/strings.xml` — package_name, custom_url_scheme
- `planext4u/android-vendor/app/src/main/res/values/strings.xml` — same
- Java package directories renamed:
  - `android/app/src/main/java/com/planext4u/customer/` → `com/p4u_customer/`
  - `android-vendor/app/src/main/java/com/planext4u/vendor/` → `com/p4u/p4u_vendor/`

### Keystores (copied from old P4U-Main repo)
| App | Path | Alias | Password | SHA-1 (verified in Firebase) |
|---|---|---|---|---|
| Customer | `planext4u/android/app/p4u_customer.keystore` | `p4u_customer` | `12345678` | `65:03:47:B3:B2:97:49:40:1F:3C:AB:26:B9:04:B1:19:C2:61:7E:31` |
| Vendor | `planext4u/android-vendor/app/p4u_vendor.keystore` | `p4u` | `12345678` | `9B:8C:D5:B8:0C:DA:15:29:73:66:FE:71:27:BA:64:82:A5:D5:B7:42` |

### Build Commands
```bash
# Customer App
cd "planext4u"
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab

# Vendor App (swap config first)
cd "planext4u"
copy capacitor.config.vendor.ts capacitor.config.ts
npm run build
npx cap sync android-vendor
cd android-vendor
./gradlew bundleRelease
# Restore customer config after
copy capacitor.config.customer.ts capacitor.config.ts
```

### To Publish Update
- Bump `versionCode` to `79` (customer) and `54` (vendor) before building
- Upload AAB to Play Console

---

## 3. Firebase Project Migration → `p4u-console`

The existing Play Store apps were registered under the **`p4u-console`** Firebase project, while the new project initially used `planext4u-ba50f`. All clients (web, Android, backend) now consistently use `p4u-console`.

### Updated Files
| File | Change |
|---|---|
| `planext4u/src/lib/firebase.ts` | Web Firebase config switched to `p4u-console` |
| `planext4u/android/app/google-services.json` | p4u-console JSON (contains both customer + vendor app entries) |
| `planext4u/android-vendor/app/google-services.json` | Same file (Firebase generates one JSON per project) |
| `planext4u-backend/.env` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_API_KEY` updated |
| `planext4u-backend/.env.production` | Same updates |

### Firebase Project Details
- **Project ID:** `p4u-console`
- **Project Number:** `784503032650`
- **Service Account:** `firebase-adminsdk-kww77@p4u-console.iam.gserviceaccount.com`
- **Web App:** `planext4u-web` (also includes `p4u-admin` web app — same config works for all web frontends)

### TODO Before Deploying Web
- Add production domain to Firebase Authorized Domains (Authentication → Settings → Authorized domains)
- Update `ALLOWED_HOSTNAMES` array in `planext4u/src/lib/firebase.ts:20`

---

## 4. Object storage (Backblaze B2 — current)

Production uploads use **Backblaze B2** via the **S3-compatible API** (`@aws-sdk/client-s3` in `planext4u-backend/src/services/storage.ts`). Set `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_S3_ENDPOINT`, and `B2_PUBLIC_URL_BASE` (see `planext4u-backend/.env.example`). The bucket should allow public read for uploaded media URLs, or serve files through a CDN in front of B2.

---

### Historical — Google Cloud Storage (replaced by B2)

Previously a dedicated GCS bucket was used under the `p4u-console` Google Cloud project.

### Bucket Details
| Field | Value |
|---|---|
| Project ID | `p4u-console` |
| Bucket Name | `planext4u-uploads` |
| Region | `asia-south1` (Mumbai) |
| Storage Class | Standard |
| Access Control | Uniform |
| Public Access | `allUsers` granted `Storage Object Viewer` (after removing Public Access Prevention) |
| Service Account Permissions | `firebase-adminsdk-kww77@p4u-console.iam.gserviceaccount.com` granted `Storage Object Admin` |

### Backend Code Fix
`planext4u-backend/src/services/storage.ts` — Removed `public: true` flag from `uploadImage()` and `uploadFile()` because uniform bucket-level access does not allow per-object ACLs. Files inherit bucket-level public read.

### Env Updates
```
GCS_PROJECT_ID=p4u-console
GCS_BUCKET=planext4u-uploads
```

Updated in both `.env` and `.env.production`.

### Public URL Format
```
https://storage.googleapis.com/planext4u-uploads/<folder>/<filename>
```

---

## 5. Admin Media Library API

Frontend was calling `/admin/media-library/*` endpoints that didn't exist in the backend. Added them.

### New Routes (in `planext4u-backend/src/modules/admin/admin.routes.ts`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/media-library` | List media (filterable by `folder`, `per_page`) |
| POST | `/admin/media-library/upload` | Upload file (multipart, accepts `folder` field) |
| PATCH | `/admin/media-library/:id` | Update folder/alt_text/tags |
| DELETE | `/admin/media-library/:id` | Delete media + remove from GCS |

All admin-authenticated. Files upload to the configured GCS bucket.

---

## 6. Backend Bug Fixes

### Bug 1: `onboardingScreen.sort_order` → `display_order`
**File:** `planext4u-backend/src/modules/content/content.routes.ts:135`

Schema field is `display_order` but code used `sort_order`. Fixed.

### Bug 2: Customer email unique-constraint blocking OTP signups
**File:** `planext4u-backend/prisma/schema.prisma`

Original schema:
```prisma
email String @unique @default("")
```

The first OTP user worked but every subsequent user crashed with `email already exists` because they all collided on `""`.

**Fix:** Changed to `email String? @unique` (nullable, no default). Multiple `null` values are allowed in Postgres unique columns.

Applied via `npx prisma db push` (used instead of `migrate dev` to avoid resetting the database).

### Bug 3: Customer email unique constraint on existing empty rows
Cleaned up via Prisma Studio — set existing empty-string emails to NULL.

---

## 7. Defensive Service Layer (FK Safety)

Created a reusable utility to prevent crashes from frontend sending stale/empty FK values.

### New Utility: `planext4u-backend/src/utils/sanitize.ts`
Three helpers:
- **`nullifyEmptyStrings(data, fields)`** — converts `""` to `null` on listed fields
- **`validateFks(data, fkMap)`** — looks up each FK in its target table; if not found, sets to `null` instead of crashing on `P2003`
- **`pick(data, fields)`** — whitelist filter to drop unknown fields

### Services Refactored to Use the Helpers
| File | Functions |
|---|---|
| `customers/customers.service.ts` | `createCustomer`, `updateCustomer` |
| `vendors/vendors.service.ts` | `registerVendor`, `updateVendor`, `registerServiceVendor`, `updateServiceVendor` |
| `products/products.service.ts` | `createProduct`, `updateProduct` |
| `services/services.service.ts` | `createService`, `updateService` |
| `classifieds/classifieds.service.ts` | `createClassified` |
| `properties/properties.service.ts` | `createProperty`, `createPropertyLocalityRow` |

---

## 8. Vendor Schema Additions (for vendor profile/payment flow)

Frontend was sending `membership`, `plan_payment_status`, `plan_transaction_id`, `shop_photo_url` for vendor management — these didn't exist in the schema.

**Added to `Vendor` model in `prisma/schema.prisma`:**
```prisma
membership          String   @default("basic")
plan_payment_status String   @default("unpaid")
plan_transaction_id String?  @default("")
shop_photo_url      String?  @default("")
```

Applied via `npx prisma db push`.

---

## 9. Service ↔ Vendor Unification

Original schema had two separate vendor models: `Vendor` (product vendors) and `ServiceVendor` (service vendors). The `Service` model's FK pointed to `ServiceVendor`. There was **no admin UI** to create service vendors, so admins could not create services for their existing vendors.

### Schema Change
- `Service.vendor` relation: `ServiceVendor` → `Vendor`
- Added `services Service[]` to `Vendor` model
- Removed `services Service[]` from `ServiceVendor` model

### Code Changes
- `services/services.service.ts` — `validateFks` now looks up `vendor` not `serviceVendor`
- `planext4u/src/components/admin/modals/ServiceModal.tsx` — fetches vendors from `/vendors` not `/vendors/service-vendors`

`ServiceVendor` table still exists but is unused for the Service flow.

---

## 10. Validation Schema Loosening

The Zod schemas were rejecting valid inputs because they enforced strict UUID format on category IDs (which are seeded as strings like `cat-electronics`) and required URL format on optional image fields (which are empty strings when blank).

### Pattern Used
```typescript
const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();
```

### Schemas Updated
| File | Changes |
|---|---|
| `products/products.schema.ts` | Removed `.uuid()` from `category_id`, `subcategory_id`; added `vendor_id`; `youtube_video_url` accepts empty string; loosened `images` array; `.passthrough()` |
| `services/services.schema.ts` | Added `vendor_id`; `youtube_video_url` accepts empty; `.passthrough()` |
| `vendors/vendors.schema.ts` | Removed all `.uuid()`; `password` optional; `avatar`/`shop_photo_url` accept empty; `.passthrough()` |
| `customers/customers.schema.ts` | `email` accepts empty; `avatar`/`profile_photo` accept empty; `.passthrough()` |
| `classifieds/classifieds.schema.ts` | Loosened `images` array; `.passthrough()` |
| `properties/properties.schema.ts` | Removed `.uuid()`; `video_url` accepts empty; `locality_id` added; `.passthrough()` |
| `admin/admin.schema.ts` | banner/ad/popup/onboarding `image` accepts empty; `.passthrough()` |

UUID validators on actual primary keys (e.g. `product_id`, `customer_id`, `order_id`) were left intact — those are real UUIDs.

---

## 11. Frontend UI Cleanup

### Removed UUID Column from Customers Table
`planext4u/src/pages/CustomersPage.tsx` — Removed `{ key: "id", label: "ID" }` from the DataTable columns. CSV export still includes IDs.

### Vendor Dropdown Filter Fix
`planext4u/src/components/admin/modals/ProductModal.tsx` — Removed `status: 'active'` filter so admins see vendors in any state (including the default `pending`).

`planext4u/src/components/admin/modals/ServiceModal.tsx` — Changed endpoint to `/vendors` (after the Service↔Vendor unification).

---

## 12. Local Development Quickstart

### Backend
```bash
cd "planext4u-backend"
npm install
npx prisma generate
npx prisma db push      # apply current schema (avoids migrate reset)
npm run db:seed         # populates admin, cities, areas, categories, plans
npm run dev             # starts on http://localhost:5000
```

### Frontend
```bash
cd "planext4u"
npm install
npm run dev             # starts on http://localhost:8080
```

### Default Admin Credentials (from seed)
| Field | Value |
|---|---|
| Email | `admin@planext4u.com` |
| Password | `Admin@123` |

---

## 13. What's Still Pending

### Server / Hosting
- [ ] Hostinger VPS access — when provided, run `./deploy.sh` on the VPS
- [ ] Production domain purchase + DNS pointed to VPS IP
- [ ] Add production domain to Firebase Authorized Domains
- [ ] Update `ALLOWED_HOSTNAMES` in `firebase.ts` with production domain

### Production Secrets (in `.env.production`)
- [ ] `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (generate fresh)
- [ ] `SMTP_PASS`
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- [ ] `GOOGLE_MAPS_API_KEY`

### Android Publishing (when ready to release)
- [ ] Bump `versionCode` to `79` (customer), `54` (vendor)
- [ ] Build AABs via `./gradlew bundleRelease`
- [ ] Upload to Play Console

---

## 14. Admin-vs-Self-Service Controller Bug (RESOLVED)

The root cause of the long "Vendor not found / vendor_id is required" debugging session.

### Root Cause
`services.controller.ts:create` and `products.controller.ts:create` were unconditionally **overwriting** `vendor_id` with the logged-in user's ID:

```ts
// BEFORE
sendCreated(res, await svc.createService({ ...req.body, vendor_id: req.user!.id }));
```

This worked for **vendor self-service routes** (vendors creating their own products/services), but **broke admin routes** — when an admin POSTed to `/services` or `/products` and selected a vendor in the form, the controller silently replaced their selection with the admin's own user ID.

### Fix
Both controllers now branch on role:

```ts
const isVendorSelfService = user?.role === 'vendor' || user?.role === 'service_vendor';
const data = isVendorSelfService
  ? { ...req.body, vendor_id: user!.id }   // self-service uses auth ID
  : req.body;                               // admin uses the picked vendor_id
```

### Files
- [services.controller.ts](planext4u-backend/src/modules/services/services.controller.ts)
- [products.controller.ts](planext4u-backend/src/modules/products/products.controller.ts)

### Audit
Searched all other controllers for the same pattern. `orders`, `commerce`, `classifieds`, `properties` use this pattern but are gated by `isCustomer` middleware so they're correct (only customers hit them, never admins).

---

## 15. Pagination `per_page` Convention Bug (RESOLVED)

The frontend uses `per_page` query param convention but the backend's `getPagination` only read `limit`. So `per_page=1000` was silently ignored and pagination defaulted to 20.

**Fix:** [planext4u-backend/src/utils/pagination.ts](planext4u-backend/src/utils/pagination.ts) now accepts both `limit` and `per_page`. Also bumped `MAX_LIMIT` from `100` → `2000` so dropdowns can fetch full lists.

---

## 16. Admin Media Library Bucket ACL Fix (RESOLVED)

### Issue
First upload attempt errored with:
> Cannot insert legacy ACL for an object when uniform bucket-level access is enabled

### Cause
[storage.ts](planext4u-backend/src/services/storage.ts) used `public: true` on every upload — that's a per-object ACL, incompatible with uniform bucket-level access.

### Fix
- Removed `public: true` from `uploadImage()` and `uploadFile()`
- Disabled "Public Access Prevention" on the GCS bucket
- Granted `allUsers` the `Storage Object Viewer` role on `planext4u-uploads`

Files served at `https://storage.googleapis.com/planext4u-uploads/<key>`.

---

## 17. Cart Add-to-Cart / Buy-Now Visual Feedback (RESOLVED)

### Issue
Items were being added to localStorage correctly, but the cart count badge in the customer header didn't update unless the user navigated. Looked like "not working".

### Fix
- [api.ts](planext4u/src/lib/api.ts) — `addToCart`/`updateCartItem`/`removeFromCart`/`clearCart` now dispatch a `p4u:cart-updated` window event after every change.
- [CustomerLayout.tsx](planext4u/src/components/customer/CustomerLayout.tsx) — listens for the event and refetches the cart count in real time.

---

## 18. Payment Flow Refactor (DONE)

The payment flow had hardcoded values and an incorrect order/payment sequence. Refactored end-to-end.

### Old Flow (Broken)
1. Frontend POST `/payments/razorpay/create-order` with `{ amount, currency }`
2. Backend required `order_id` upfront (UUID) — frontend didn't have one
3. Backend response missing `key_id` — Razorpay modal couldn't open
4. After payment, frontend manually POSTed to `/orders` with a custom `P4U-{date}-{rand}` ID format
5. Hardcoded `customerId = 'USR-001'`, `vendor_id = 'VND-001'`, `gst = 0.18`

### New Flow (Working)
1. Frontend POST `/payments/razorpay/create-order` with just `{ amount, currency }`
2. Backend creates Razorpay order, returns `{ razorpay_order_id, amount, currency, key_id }`
3. Frontend opens Razorpay checkout with `key_id`
4. On success, frontend POST `/payments/razorpay/verify` with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, address, totals }`
5. Backend verifies signature, then **creates the real DB Order(s) + Payment row in one atomic step**, grouping cart items by vendor
6. Frontend clears the local cart and shows the success screen

### Files Changed
| File | Change |
|---|---|
| [payments.schema.ts](planext4u-backend/src/modules/payments/payments.schema.ts) | `createPaymentSchema` no longer needs `order_id`; `verifyPaymentSchema` accepts `cart`, `totals`, `address` |
| [payments.service.ts](planext4u-backend/src/modules/payments/payments.service.ts) | `initiatePayment` returns `key_id`; `confirmPayment` creates Order + OrderItems + Payment rows after signature check; uses correct schema field names (`tax_amount`, `discount_amount`) |
| [payments.controller.ts](planext4u-backend/src/modules/payments/payments.controller.ts) | Updated to match new service signatures, gets `customerId` from auth |
| [PaymentPage.tsx](planext4u/src/pages/customer/PaymentPage.tsx) | Removed `'USR-001'`, `'VND-001'`, hardcoded `0.18` GST. Removed manual `createOrder()` — backend now handles it. Redirects to login if user not authenticated. |

---

## 19. Social Flow Cleanup (PARTIALLY DONE)

> **Update:** See **§21 Socio & customer wallet / loyalty** for current endpoints (media uploads, like points, wallet). **§22** summarizes how this section relates to newer work.

The social/feed flow had **massive amounts of mock data** baked into the frontend that would have shipped to production.

### What Was Hardcoded (now removed)
- `FALLBACK_POSTS` — 6 fake posts (`p1`–`p6`) with `picsum.photos` URLs, fake usernames, fake counts
- `MOCK_STORIES` — 10 fake stories with `i.pravatar.cc` avatars
- `mockComments` — 3 fake comments hardcoded with `'user1'`, `'user2'`, `'user3'` IDs
- `CommentItem` had a hardcoded mapping `user1 → 'vijay'`, `user2 → 'priya'`, `user3 → 'anita'`
- `isMock` checks throughout `PostCard` and mutations
- Calls to non-existent endpoints `/social/posts/:id/liked` and `/social/posts/:id/bookmarked`

### What Was Done
- Stripped `FALLBACK_POSTS`, `MOCK_STORIES`, `mockComments` arrays from [SocialFeedPage.tsx](planext4u/src/pages/customer/SocialFeedPage.tsx)
- Removed `isMock` branching from `CommentItem`
- Replaced `/posts/:id/liked` and `/posts/:id/bookmarked` queries with `is_liked_by_me` / `is_bookmarked_by_me` fields read directly from the post object
- Comments now resolve commenter via `comment.profile` (joined from backend) or fall back to a profile lookup

### What's Still Pending in Social
- The remainder of [SocialFeedPage.tsx](planext4u/src/pages/customer/SocialFeedPage.tsx) still references the deleted variables (`MOCK_STORIES`, `FALLBACK_POSTS`, `isMock`, `mockComments`, `setLocalLikeCount`, `setMockComments`) at lines ~245, ~263, ~280, ~660, ~668. These will cause **TypeScript errors** until cleaned up.
- Backend [social.service.ts](planext4u-backend/src/modules/social/social.service.ts) `getFeed`, `getExploreFeed`, `getPost` need to include `is_liked_by_me` / `is_bookmarked_by_me` flags on each post when called by an authenticated user (currently they don't).
- Other social pages (Reels, Explore, CreatePost, Profile, Notifications) likely have similar mock data — not yet audited.

---

## 20. What's Still Pending (Updated)

### Server / Hosting
- [ ] Hostinger VPS access — when provided, run `./deploy.sh` on the VPS
- [ ] Production domain purchase + DNS pointed to VPS IP
- [ ] Add production domain to Firebase Authorized Domains
- [ ] Update `ALLOWED_HOSTNAMES` in `firebase.ts` with production domain

### Production Secrets (in `.env.production`)
- [ ] `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (generate fresh)
- [ ] `SMTP_PASS`
- [ ] `GOOGLE_MAPS_API_KEY`
- Note: Razorpay keys already configured in dev `.env`

### Android Publishing (when ready to release)
- [ ] Bump `versionCode` to `79` (customer), `54` (vendor)
- [ ] Build AABs via `./gradlew bundleRelease`
- [ ] Upload to Play Console

### Code — Open Items
- [ ] Audit other social pages (`SocialReelsPage`, `SocialExplorePage`, `SocialProfilePage`) for leftover mock data (feed/create/wallet largely done)
- [ ] End-to-end test the new payment flow with real Razorpay test credentials

---

## 21. Socio (social) & customer wallet / loyalty (2026)

### Customer media uploads (stories & posts)
- **Do not** use `POST /api/v1/admin/media-library/upload` for logged-in customers — it requires **admin** and returns **403**.
- Use:
  - **`POST /api/v1/media/image?folder=<folder>`** — multipart field name **`image`** (images / WebP thumbs). Optional: falls back to **`/media/document`** on **413** (oversize).
  - **`POST /api/v1/media/document`** — multipart field **`document`** (videos, audio, or large files).
- Implemented in:
  - [planext4u/src/lib/customer-media-upload.ts](planext4u/src/lib/customer-media-upload.ts) — shared helpers
  - [SocialFeedPage.tsx](planext4u/src/pages/customer/SocialFeedPage.tsx) — stories
  - [SocialCreatePostPage.tsx](planext4u/src/pages/customer/SocialCreatePostPage.tsx) — posts

### Post owner points when someone likes a post
- Env: **`SOCIAL_LIKE_RECEIVER_POINTS`** (default `1`, set **`0`** to disable). See [planext4u-backend/.env.example](planext4u-backend/.env.example).
- On **like** (not self-like): post owner’s **`customer.wallet_points`** increases; a **`points_transactions`** row is created with:
  - **`type`:** `social_post_like_received`
  - **`social_post_id`**, **`social_liker_profile_id`** — used to **reverse** on **unlike** (wallet decremented, row deleted).
- Migration: [20260410120000_points_transaction_social_like](planext4u-backend/prisma/migrations/20260410120000_points_transaction_social_like/migration.sql) adds `social_post_id` and `social_liker_profile_id` on `points_transactions`.
- Service logic: [social.service.ts](planext4u-backend/src/modules/social/social.service.ts) — `likePost`.

### Customer wallet UI
- **My Wallet** must load data with **`GET /api/v1/customers/me/wallet`** (returns `{ balance, transactions }`).
- Do **not** use **`GET /admin/points-transactions`** from the customer app (admin-only).
- UI shows breakdown tiles including **Post likes (Socio)** (sum of `social_post_like_received`).
- Buttons: **Shop & redeem** → `/app/browse`, **Refer & earn** → `/app/referrals`.
- File: [CustomerWalletPage.tsx](planext4u/src/pages/customer/CustomerWalletPage.tsx).

### Social profile API
- **`GET /api/v1/social/profiles/:id`** resolves by **social profile id**, **username**, or **`customer_id`** (UUID) so mixed client ids still work.
- **404** responses for missing profiles are not logged at **ERROR** (see [errorHandler.ts](planext4u-backend/src/middleware/errorHandler.ts)).

### Prisma: existing DB + new migrations
If **`migrate deploy`** fails on **`init`** with “relation already exists”, baseline then deploy:

```bash
npx prisma migrate resolve --applied "20260409140337_init"
npx prisma migrate deploy
```

(Only when the database already matches that migration.)

---

## 22. Social Flow Cleanup (section 19) — status

Earlier section 19 listed mock data removal and pending items. As of the work above:
- Feed/stories use API-backed data; customer uploads and post/story flows go through **media** endpoints.
- **`is_liked_by_me` / `is_bookmarked_by_me`** are attached in **`getFeed`** for authenticated users ([social.service.ts](planext4u-backend/src/modules/social/social.service.ts)).
- Remaining audits (Reels/Explore/Profile) are optional cleanup, not blockers for core feed.

---

## 23. Backend deployment notes (full — bare VPS + PM2)

Manual setup on Ubuntu (e.g. Contabo): SSH, Node 20, PostgreSQL, Redis, PM2. Alternative to Docker/`deploy.sh` in §1.

### 1. Connect to server

```bash
ssh root@YOUR_SERVER_IP
```

### 2. Initial setup

```bash
passwd
apt update
apt upgrade -y
reboot
```

SSH in again after the reboot.

### 3. Firewall

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Optional (only while testing the API **before** Nginx reverse proxy): `ufw allow 5000/tcp` — remove or deny later when Nginx fronts the app on 443.

### 4. Basic tools

```bash
apt install -y git curl build-essential
```

### 5. Node.js (v20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

### 6. PM2

```bash
npm install -g pm2
pm2 -v
```

### 7. PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl status postgresql
```

### 8. Create database user and database

```bash
sudo -u postgres psql
```

In the `psql` prompt:

```sql
CREATE USER planext WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE planext4u OWNER planext;
\q
```

Use the same password in `DATABASE_URL` on the server. Prefer a unique strong password in production.

### 9. Redis

```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping
```

Expect `PONG`.

### 10. Clone project

```bash
cd /var/www
git clone https://github.com/kumaresonR/P4U.git
cd P4U/planext4u-backend
```

(Replace the clone URL if you use a fork or private remote.)

### 11. Environment file

```bash
cp .env.example .env
nano .env
```

Set at minimum:

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=postgresql://planext:StrongPassword123!@localhost:5432/planext4u` (match §8 password)
- `REDIS_URL=redis://127.0.0.1:6379`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — **each must be at least 32 characters** (see `src/config/env.ts`)

Fill SMTP, Razorpay, Firebase, **`B2_*`** (object storage), `GOOGLE_MAPS_API_KEY`, **`FRONTEND_URLS`** (production `https://` origins), etc. as needed.

Save in nano: **Ctrl+X**, then **Y**, then **Enter**.

### 12. Install dependencies

```bash
npm ci
```

### 13. Prisma

```bash
npx prisma generate
npx prisma migrate deploy
```

If the DB was created from an older dump and `migrate deploy` fails on the first migration, see **§21** (baseline `prisma migrate resolve`).

### 14. Build issues (reference)

- **`tsconfig.json`:** `"include": ["src/**/*"]` (do not compile `prisma/seed.ts` into `dist` unless intentional).
- **`src/services/sms.ts`:** Twilio removed; stub should log or no-op, e.g. `sendSMS` implementation that does not require Twilio.

### 15. Build

```bash
npm run build
```

### 16. Start with PM2

```bash
pm2 start dist/server.js --name backend
```

### 17. PM2 on boot

```bash
pm2 save
pm2 startup
```

Run the **`sudo env PATH=...`** command PM2 prints so the process restarts after reboot.

### 18. Check status

```bash
pm2 list
```

### 19. Logs

```bash
pm2 logs backend
```

### 20. Test API

- With firewall port 5000 open: `http://YOUR_SERVER_IP:5000/api/v1/...` (use a real route your app exposes).
- After Nginx + SSL: use the domain and paths configured in Nginx (no public `:5000`).

### Important notes

- Prefer changing the app on **GitHub**, then `git pull` on the server — avoid editing production code only on the VPS.
- **Secrets:** keep real keys in `.env` on the server; do not paste private keys into public issues. If anything was ever committed or leaked, **rotate** SMTP, Razorpay, Firebase, JWT, DB password.
- This repo’s root `.gitignore` may still track `planext4u-backend/.env` — treat that as sensitive in any remote.

### Final checklist

- [ ] Backend process running under PM2
- [ ] `pm2 startup` + `pm2 save` applied
- [ ] PostgreSQL + Redis reachable from the app
- [ ] Production env vars set

### Next steps

See **§24** — same-VPS **frontend build**, **Nginx SPA + API**, **DNS (Cloudflare)**, **Let’s Encrypt / Certbot**, and **`FRONTEND_URLS`**.

---

## 24. Frontend + domain + HTTPS (same VPS as backend)

End-to-end flow used for **`planext4u.com`**: DNS → Nginx `server_name` → Certbot → Vite production build → static `dist/` → Nginx serves SPA and proxies **`/api/`** to PM2.

### A. DNS (Cloudflare or registrar)

1. **A** record **`@`** (`planext4u.com`) → **VPS IPv4**.  
2. **A** record **`www`** → **same IPv4** (remove old **`www` → CloudFront** CNAME if present — CNAME and A cannot both exist for `www`).  
3. Do **not** paste the shell prompt into commands (e.g. type `cd /path` only, not `root@host#cd /path`).

### B. Nginx — name the site before Certbot can install

1. Install Nginx: `apt install -y nginx`  
2. Edit **`/etc/nginx/sites-available/default`** (or your site file): set  
   `server_name planext4u.com www.planext4u.com;`  
   (replace **`server_name _;`** catch-all if that was the only block.)  
3. **`nginx -t && systemctl reload nginx`**

### C. Let’s Encrypt (Certbot)

1. Install: `apt install -y certbot python3-certbot-nginx`  
2. Request cert (interactive):  
   `certbot --nginx -d planext4u.com -d www.planext4u.com`  
3. Prompts: **email** (any inbox you read), **(Y)es** to terms, **(Y)/(N)** for EFF email (optional).  
4. If Certbot says **certificate saved** but **“Could not install certificate”** / **no matching server block**: fix **`server_name`** as in **§B**, then:  
   `certbot install --cert-name planext4u.com`  
5. Confirm **`ss -tlnp | grep ':443'`** shows Nginx on **443**.  
6. **Cloudflare → SSL/TLS:** use **Full (strict)** (or **Full**) so origin HTTPS matches Certbot.

### D. `git pull` when `planext4u-backend/.env` blocks merge

```bash
cp /var/www/P4U/planext4u-backend/.env /root/planext4u-backend.env.backup
cd /var/www/P4U
git stash push -m "server env" -- planext4u-backend/.env
git pull
cp /root/planext4u-backend.env.backup /var/www/P4U/planext4u-backend/.env
```

Optional — stop future pulls from overwriting server `.env`:

```bash
cd /var/www/P4U
git update-index --skip-worktree planext4u-backend/.env
```

### E. Backend after HTTPS

In **`planext4u-backend/.env`** on the server:

```env
FRONTEND_URLS=https://planext4u.com,https://www.planext4u.com
```

Then:

```bash
cd /var/www/P4U/planext4u-backend
pm2 restart backend --update-env
pm2 save
```

**`DATABASE_URL`:** if the password contains **`@`**, URL-encode it as **`%40`** inside the password segment.

### F. Frontend env (repo — production build)

- **`planext4u/.env.production`** — `VITE_API_URL=https://planext4u.com/api/v1` (used by **`vite build`** automatically).  
- **`planext4u/.env`** — keeps **`http://localhost:5000/api/v1`** for **`npm run dev`**.  
- **`planext4u/.npmrc`** — `legacy-peer-deps=true` so **`npm ci`** succeeds (Capacitor Firebase vs Firebase v10 peer mismatch on the server).

### G. Build frontend on the VPS and deploy static files

```bash
cd /var/www/P4U
git pull
cd /var/www/P4U/planext4u
npm ci
npm run build
sudo mkdir -p /var/www/planext4u-frontend
sudo rm -rf /var/www/planext4u-frontend/*
sudo cp -r dist/* /var/www/planext4u-frontend/
sudo chown -R www-data:www-data /var/www/planext4u-frontend
```

If **`npm ci`** fails with **`ERESOLVE`** before **`.npmrc`** exists on the server, use once: **`npm ci --legacy-peer-deps`**, then **`git pull`** after the repo includes **`.npmrc`**.

### H. Nginx — SPA + API (replace “all traffic to Node”)

Reference file in repo: **[deploy/nginx-planext4u-spa.conf.example](deploy/nginx-planext4u-spa.conf.example)** — **`/`** = static **`root /var/www/planext4u-frontend`** + **`try_files`** for the SPA; **`/api/`** and **`/socket.io/`** → **`http://127.0.0.1:5000`**; **`client_max_body_size 50m`**; Let’s Encrypt paths under **`/etc/letsencrypt/live/planext4u.com/`**.

On the server:

```bash
sudo cp /etc/nginx/sites-available/default /root/nginx-default.backup-$(date +%F)
sudo cp /var/www/P4U/deploy/nginx-planext4u-spa.conf.example /etc/nginx/sites-available/planext4u
sudo ln -sf /etc/nginx/sites-available/planext4u /etc/nginx/sites-enabled/planext4u
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Restore an old Nginx layout from **`/root/nginx-default.backup-*`** if needed.

### I. Smoke tests

- **`https://planext4u.com`** — SPA loads (not only JSON “Route not found” on `/`).  
- **`https://planext4u.com/api/v1/master/cities`** — JSON from API.  
- **`pm2 list`** — **`backend`** **online**.

### J. Firebase (web)

Authentication → **Authorized domains** → add **`planext4u.com`** and **`www.planext4u.com`** if the web app uses Firebase Auth.

### K. Operational notes

- **`pm2 restart backend --update-env`** after changing **`.env`** so PM2 picks up new variables.  
- **521** from Cloudflare: origin not answering on the port/mode Cloudflare uses — often **no :443** while SSL mode is **Full**; use **Flexible** until Certbot is done, or complete **§C**.  
- **Root `/` JSON 404** before the SPA deploy is normal (API has no `/` route; routes live under **`/api/v1`**).  
- **B2 / media:** if public URLs return **403**, check bucket rules, CORS, and whether the app expects **public read** vs **signed URLs** (`B2_*` in **`planext4u-backend/.env`**).

