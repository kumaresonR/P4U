import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimiter';
import { notFound, errorHandler } from './middleware/errorHandler';
import routes from './routes';
import adminApiRoutes  from './routes/admin-api.routes';
import authPublicRoutes from './routes/auth-public.routes';

const app = express();

// ─── Proxy (nginx in front) ──────────────────────────────────────────────────
// Trust the first proxy so req.ip + X-Forwarded-For work correctly for rate limiting.
app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan(env.IS_DEV ? 'dev' : 'combined'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(env.API_PREFIX, routes);

// ─── Admin-web compatible paths ───────────────────────────────────────────────
app.use('/api/admin',        adminApiRoutes);
app.use('/api/auth/public',  authPublicRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
