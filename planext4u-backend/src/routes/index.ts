import { Router } from 'express';

// ─── Existing modules ──────────────────────────────────────────────────────────
import authRoutes         from '../modules/auth/auth.routes';
import masterRoutes       from '../modules/master/master.routes';
import customerRoutes     from '../modules/customers/customers.routes';
import vendorRoutes       from '../modules/vendors/vendors.routes';
import productRoutes      from '../modules/products/products.routes';
import serviceRoutes      from '../modules/services/services.routes';
import orderRoutes        from '../modules/orders/orders.routes';
import paymentRoutes      from '../modules/payments/payments.routes';
import classifiedRoutes   from '../modules/classifieds/classifieds.routes';
import propertyRoutes     from '../modules/properties/properties.routes';
import socialRoutes       from '../modules/social/social.routes';
import socialV2Routes     from '../modules/social/social-v2.routes';
import notificationRoutes from '../modules/notifications/notifications.routes';
import adminRoutes        from '../modules/admin/admin.routes';
import mediaRoutes        from '../modules/media/media.routes';

// ─── Frontend-compatible route groups ─────────────────────────────────────────
import catalogRoutes      from '../modules/catalog/catalog.routes';
import commerceRoutes     from '../modules/commerce/commerce.routes';
import profileRoutes      from '../modules/profile/profile.routes';
import contentRoutes      from '../modules/content/content.routes';
import vendorAppRoutes    from '../modules/vendor-app/vendor.routes';
import vendorApplicationsRoutes from '../modules/vendor-applications/vendor-applications.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Original API routes ───────────────────────────────────────────────────────
router.use('/auth',          authRoutes);
router.use('/master',        masterRoutes);
router.use('/customers',     customerRoutes);
router.use('/vendors',       vendorRoutes);
router.use('/products',      productRoutes);
router.use('/services',      serviceRoutes);
router.use('/orders',        orderRoutes);
router.use('/payments',      paymentRoutes);
router.use('/classifieds',   classifiedRoutes);
router.use('/properties',    propertyRoutes);
router.use('/social',        socialRoutes);
router.use('/social',        socialV2Routes);   // v2 overlays on same prefix
router.use('/notifications', notificationRoutes);
router.use('/admin',         adminRoutes);
router.use('/media',         mediaRoutes);

// ─── Frontend-compatible aliases ──────────────────────────────────────────────
router.use('/catalog',       catalogRoutes);
router.use('/commerce',      commerceRoutes);
router.use('/profile',       profileRoutes);
router.use('/content',       contentRoutes);
router.use('/vendor',        vendorAppRoutes);  // singular /vendor (user web)
router.use('/vendor-applications', vendorApplicationsRoutes);

export default router;
