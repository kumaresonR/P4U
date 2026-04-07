# Planext4U — Unified Node.js Backend

Complete backend API for User App, Vendor App, and Admin Dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT + bcrypt |
| Payments | Razorpay |
| Push Notifications | Firebase Admin (FCM) |
| File Storage | AWS S3 |
| Email | Nodemailer |
| SMS / OTP | Twilio |
| Real-time | Socket.io |
| Validation | Zod |

---

## Project Structure

```
src/
├── config/          # env, database, redis, constants
├── middleware/       # auth, rbac, validate, rateLimiter, upload, errorHandler
├── modules/
│   ├── auth/        # OTP, JWT, Google OAuth, FCM token
│   ├── customers/   # customer CRUD, addresses, wallet, wishlist
│   ├── vendors/     # product & service vendors, bank details
│   ├── products/    # products, variants, attributes
│   ├── services/    # marketplace services
│   ├── orders/      # cart, orders, settlements
│   ├── payments/    # Razorpay create/verify/webhook
│   ├── classifieds/ # classified ads
│   ├── properties/  # real estate listings, rent tracker, EMI
│   ├── social/      # posts, stories, DMs, follows
│   ├── notifications/ # push & in-app notifications
│   ├── admin/       # dashboard, reports, banners, CMS, support
│   ├── master/      # cities, areas, categories, tax, plans
│   └── media/       # file upload to S3
├── services/        # firebase, razorpay, storage, email, sms
├── socket/          # Socket.io real-time events
├── workers/         # BullMQ email & notification queue workers
├── utils/           # jwt, otp, password, pagination, response, logger
├── types/           # shared TypeScript types
├── routes/          # central route registration
├── app.ts           # Express app setup
└── server.ts        # HTTP server + Socket.io entry point
```

---

## Setup

### 1. Clone & Install

```bash
cd planext4u-backend
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 4. Run Dev Server

```bash
npm run dev
```

Server starts at: `http://localhost:5000`  
API base: `http://localhost:5000/api/v1`

---

## Docker (Full Stack)

```bash
docker-compose up -d
```

Starts: App (5000) + PostgreSQL (5432) + Redis (6379)

---

## API Endpoints Summary

### Auth — `/api/v1/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/otp/send` | Send OTP to mobile |
| POST | `/otp/verify` | Verify OTP & login/register |
| POST | `/customer/register` | Register with email/password |
| POST | `/customer/login` | Login with email/password |
| POST | `/vendor/login` | Vendor login (`?type=vendor` or `service_vendor`) |
| POST | `/admin/login` | Admin login |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout (blacklist token) |
| POST | `/forgot-password` | Send reset email |
| POST | `/reset-password` | Reset with token |
| POST | `/fcm-token` | Register FCM device token |

### Master Data — `/api/v1/master`
`GET/POST/PUT/DELETE` on: `cities`, `areas`, `occupations`, `categories`, `service-categories`, `tax-configs`, `vendor-plans`, `platform-variables`

### Customers — `/api/v1/customers`
Self: `/me`, `/me/addresses`, `/me/wallet`, `/me/wishlist`  
Admin: CRUD, bulk-delete, bulk-status

### Vendors — `/api/v1/vendors`
Register, login, self dashboard & bank update  
Admin: CRUD, status approval, bulk actions  
Service vendors: `/service-vendors/*`

### Products — `/api/v1/products`
Public: `/browse`, `/:id`  
Vendor: `/vendor/my` (CRUD + variants)  
Admin: full CRUD + bulk actions

### Services — `/api/v1/services`
Public: `/browse`, `/:id`  
Service Vendor: `/vendor/my`  
Admin: full CRUD + bulk actions

### Orders — `/api/v1/orders`
Cart: `/cart` (GET, POST, PUT, DELETE)  
Customer: POST `/` (place order), GET `/my`  
Admin/Vendor: GET `/`, `/:id`, PUT `/:id/status`  
Settlements: GET/PUT `/settlements`

### Payments — `/api/v1/payments`
| POST | `/create-order` | Create Razorpay order |
| POST | `/verify` | Verify payment signature |
| POST | `/webhook` | Razorpay webhook |

### Classifieds — `/api/v1/classifieds`
Public: `/browse`, `/:id`  
Customer: POST, PUT, DELETE, GET `/my`  
Admin: GET all, PUT `/:id/status`

### Properties — `/api/v1/properties`
Public: `/search`, `/:id`, `/emi-calculator`  
Customer: POST, PUT, DELETE, `/my/listings`, messages, saved-searches, rent-tracker  
Admin: `/admin/all`, PUT `/:id/status`

### Social — `/api/v1/social`
Profiles, feed, explore, posts, likes, comments, follows, stories, DMs

### Notifications — `/api/v1/notifications`
GET, mark read, unread count  
Admin: `/broadcast`, `/send`

### Admin — `/api/v1/admin`
Dashboard, reports, banners, ads, popups, CMS, contact, support tickets, email subscriptions, activity logs

### Media — `/api/v1/media`
POST `/image`, `/images`, `/document`  
GET `/library`, DELETE `/:id`

---

## Real-time (Socket.io)

Connect with JWT in `auth.token` handshake.

| Event | Direction | Description |
|---|---|---|
| `subscribe:order` | Client→Server | Join order room |
| `order:status` | Server→Client | Order status update |
| `dm:send` | Client→Server | Send DM |
| `dm:receive` | Server→Client | Receive DM |
| `dm:typing` | Client→Server | Typing indicator |

---

## Environment Variables

See `.env.example` for all required variables.

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm run start        # Run compiled production build
npm run db:generate  # Prisma client generate
npm run db:migrate   # Run migrations
npm run db:deploy    # Deploy migrations (production)
npm run db:seed      # Seed initial data
npm run db:studio    # Open Prisma Studio
npm run lint         # ESLint
```
