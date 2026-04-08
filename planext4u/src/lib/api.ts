// API Service Layer — Express backend (migrated from Supabase)
// All operations go through the custom REST API via apiClient

import { api as http } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string; name: string; mobile: string; email: string;
  city_id: string; area_id: string; latitude: number; longitude: number;
  wallet_points: number; referral_code: string; referred_by: string | null;
  status: 'active' | 'inactive' | 'suspended'; created_at: string;
  occupation?: string;
}

export interface Vendor {
  id: string; name: string; business_name: string; mobile: string; email: string;
  category_id: string; city_id: string; area_id: string;
  commission_rate: number; membership: string;
  status: 'pending' | 'level1_approved' | 'level2_approved' | 'verified' | 'rejected';
  created_at: string; rating?: number; total_products?: number; total_orders?: number; total_revenue?: number;
}

export interface Product {
  id: string; vendor_id: string; category_id: string; title: string; description: string;
  price: number; tax: number; discount: number; max_points_redeemable: number;
  status: 'active' | 'inactive' | 'draft' | 'pending_approval' | 'rejected';
  vendor_name?: string; category_name?: string; emoji?: string; image?: string;
  rating?: number; reviews?: number; stock?: number; sales?: number;
  rejection_reason?: string;
  created_at?: string; updated_at?: string;
  short_description?: string; long_description?: string;
  discount_type?: string; inactivation_reason?: string;
  images?: string[]; youtube_video_url?: string;
  tax_slab_id?: string; product_attributes?: any[];
  max_redemption_percentage?: number | null;
  is_available?: boolean; duration_hours?: number; duration_minutes?: number;
  promise_p4u?: string; helpline_number?: string;
  thumbnail_image?: string; banner_image?: string;
  subcategory_id?: string; subcategory_name?: string;
  product_type?: 'simple' | 'variable' | 'service';
  sku?: string; slug?: string;
  meta_title?: string; meta_description?: string;
  manage_stock?: boolean; stock_status?: string;
  weight?: number; dimensions?: any;
}

export interface ProductVariant {
  id: string; product_id: string; sku?: string;
  price: number; compare_at_price?: number;
  stock_quantity: number; stock_status: string;
  weight?: number; dimensions?: any;
  variant_attributes: Record<string, string>;
  image_url?: string; is_active: boolean; sort_order?: number;
  created_at?: string; updated_at?: string;
}

export interface Service {
  id: string; vendor_id: string; category_id: string; title: string; description: string;
  price: number; tax: number; discount: number; max_points_redeemable: number;
  status: 'active' | 'inactive' | 'draft';
  vendor_name?: string; category_name?: string; emoji?: string; image?: string;
  rating?: number; reviews?: number; service_area?: string; duration?: string;
  created_at?: string;
}

export interface Order {
  id: string; customer_id: string; vendor_id: string;
  subtotal: number; tax: number; discount: number; points_used: number; total: number;
  status: 'placed' | 'paid' | 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  created_at: string; updated_at?: string; customer_name?: string; vendor_name?: string;
  items?: { title: string; qty: number; emoji: string; price: number; image?: string }[];
  delivery_rating?: number | null; rating_comment?: string | null; rated_at?: string | null;
}

export interface Settlement {
  id: string; vendor_id: string; order_id: string;
  amount: number; commission: number; net_amount: number;
  status: 'pending' | 'eligible' | 'settled' | 'on_hold';
  settled_at: string | null; created_at?: string; vendor_name?: string;
}

export interface ClassifiedAd {
  id: string; title: string; description: string; price: number;
  category: string; city: string; area: string; images: string[];
  user_id: string; status: 'pending' | 'approved' | 'rejected' | 'expired' | 'sold';
  created_at: string; user_name?: string;
}

export interface PointsTransaction {
  id: string; user_id: string; type: 'welcome' | 'referral' | 'order_reward';
  points: number; description: string; created_at: string; user_name?: string;
}

export interface Referral {
  id: string; referrer_id: string; referee_id: string;
  status: 'pending' | 'completed'; points_awarded: number;
  created_at: string; referrer_name?: string; referee_name?: string;
}

export interface Category {
  id: string; name: string; parent_id: string | null; image: string;
  status: 'active' | 'inactive'; count?: number; created_at?: string;
  banner_image?: string; icon?: string; is_trending?: boolean; description?: string;
}

export interface Banner {
  id: string; title: string; desktop_image: string; mobile_image: string;
  link: string; priority: number; start_date: string; end_date: string;
  status: 'active' | 'inactive'; subtitle?: string; gradient?: string; created_at?: string;
}

export interface PlatformVariable {
  id: string; key: string; value: string; description: string;
}

export interface Occupation {
  id: string; name: string; status: 'active' | 'inactive'; customer_count: number; created_at: string;
}

export interface City {
  id: string; name: string; state: string; status: 'active' | 'inactive'; area_count: number; created_at: string;
}

export interface Area {
  id: string; name: string; city_id: string; city_name: string; pincode: string; status: 'active' | 'inactive'; created_at: string;
}

export interface TaxConfig {
  id: string; name: string; rate: number; type: 'GST' | 'Cess'; status: 'active' | 'inactive'; applied_to: string; created_at: string;
}

export interface PopupBanner {
  id: string; title: string; description: string; image: string; link: string; status: 'active' | 'inactive'; start_date: string; end_date: string; created_at: string;
}

export interface Advertisement {
  id: string; title: string; advertiser: string; placement: string; type: 'banner' | 'sidebar' | 'sponsored' | 'strip';
  status: 'active' | 'paused' | 'expired'; impressions: number; clicks: number;
  start_date: string; end_date: string; revenue: number; created_at: string;
}

export interface WebsiteQuery {
  id: string; name: string; email: string; phone: string; subject: string; message: string;
  status: 'new' | 'in_progress' | 'resolved'; created_at: string;
}

export interface ReportLog {
  id: string; report_type: string; generated_by: string; format: string;
  status: 'completed' | 'failed' | 'processing'; file_size: string; created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; per_page: number; total_pages: number;
}

export interface DashboardStats {
  total_customers: number; total_vendors: number; total_orders: number; total_revenue: number;
  pending_settlements: number; active_ads: number; total_services: number;
  customers_trend: number; vendors_trend: number; orders_trend: number; revenue_trend: number;
  recent_orders: Order[];
  revenue_chart: { date: string; revenue: number; orders: number }[];
  top_vendors: { name: string; revenue: number; orders: number }[];
  category_distribution: { name: string; count: number }[];
}

export interface CartItem {
  id: string; title: string; price: number; qty: number; vendor: string;
  vendor_id: string; emoji: string; image?: string; maxPoints: number; tax: number; discount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Kept for backwards compat — not used
export const setAuthToken = (_token: string | null) => {};

// Adapt apiClient paginate ({ count }) → PaginatedResponse ({ total })
async function paginate<T>(path: string, params?: Record<string, any>): Promise<PaginatedResponse<T>> {
  const r = await http.paginate<T>(path, params);
  return { data: r.data, total: r.count, page: r.page, per_page: r.per_page, total_pages: r.total_pages };
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth (legacy stub — actual login is in auth-provider.tsx)
  login: async (email: string, _password: string) => {
    return { token: 'jwt', user: { id: '1', name: 'Admin', email } };
  },

  // Customer Registration — now handled in CustomerRegisterPage via apiClient directly
  registerCustomer: async (data: { name: string; mobile: string; email: string; city: string; area: string; referral_code?: string; occupation?: string }) => {
    const result: any = await http.put('/customers/me', data);
    return { success: true, user: result };
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  getDashboardStats: async (): Promise<DashboardStats> => {
    return http.get<DashboardStats>('/admin/dashboard');
  },

  // ─── Customers ───────────────────────────────────────────────────────────────

  getCustomers: async (params: { page?: number; per_page?: number; search?: string; status?: string; occupation?: string; date_from?: string; date_to?: string }) => {
    return paginate<User>('/customers', params);
  },

  updateCustomer: async (id: string, data: Partial<User>) => {
    await http.patch(`/customers/${id}`, data);
    return { success: true };
  },

  createCustomer: async (data: Partial<User>) => {
    const customer = await http.post<User>('/customers', data);
    return { success: true, customer };
  },

  deleteCustomer: async (id: string) => {
    await http.delete(`/customers/${id}`);
    return { success: true };
  },

  // ─── Vendors ─────────────────────────────────────────────────────────────────

  getVendors: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string; payment_status?: string }) => {
    return paginate<Vendor>('/vendors', params);
  },

  updateVendorStatus: async (id: string, status: string) => {
    await http.patch(`/vendors/${id}`, { status });
    return { success: true };
  },

  updateVendor: async (id: string, data: Partial<Vendor>) => {
    await http.patch(`/vendors/${id}`, data);
    return { success: true };
  },

  createVendor: async (data: Partial<Vendor>, _type: 'product' | 'service' = 'product') => {
    const vendor = await http.post<Vendor>('/vendors', data);
    return { success: true, vendor };
  },

  deleteVendor: async (id: string) => {
    await http.delete(`/vendors/${id}`);
    return { success: true };
  },

  // ─── Products ────────────────────────────────────────────────────────────────

  getProducts: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string; status?: string }) => {
    return paginate<Product>('/products', params);
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    await http.patch(`/products/${id}`, data);
    return { success: true };
  },

  createProduct: async (data: Partial<Product>) => {
    const product = await http.post<Product>('/products', data);
    return { success: true, product };
  },

  deleteProduct: async (id: string) => {
    await http.delete(`/products/${id}`);
    return { success: true };
  },

  getProductById: async (id: string): Promise<Product | null> => {
    return http.get<Product>(`/products/${id}`).catch(() => null);
  },

  // ─── Services ────────────────────────────────────────────────────────────────

  getServices: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string }) => {
    return paginate<Service>('/services', params);
  },

  getServiceById: async (id: string): Promise<Service | null> => {
    return http.get<Service>(`/services/${id}`).catch(() => null);
  },

  browseServices: async (params: { category?: string; search?: string; sort?: string }) => {
    return http.get<Service[]>('/catalog/services', params as any);
  },

  getServiceCategories: async () => {
    return http.get<Category[]>('/categories', { type: 'service' } as any);
  },

  updateService: async (id: string, data: Partial<Service>) => {
    await http.patch(`/services/${id}`, data);
    return { success: true };
  },

  createService: async (data: Partial<Service>) => {
    const service = await http.post<Service>('/services', data);
    return { success: true, service };
  },

  deleteService: async (id: string) => {
    await http.delete(`/services/${id}`);
    return { success: true };
  },

  // ─── Orders ──────────────────────────────────────────────────────────────────

  getOrders: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<Order>('/orders', params);
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    await http.patch(`/orders/${id}/status`, { status });
    return { success: true };
  },

  placeOrder: async (cartItems: CartItem[], _customerId: string, pointsUsed: number, discount: number) => {
    const orders = await http.post<Order[]>('/orders', { items: cartItems, points_used: pointsUsed, discount });
    return { success: true, orders };
  },

  // ─── Settlements ─────────────────────────────────────────────────────────────

  getSettlements: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<Settlement>('/orders/settlements', params);
  },

  settleSettlement: async (id: string) => {
    await http.patch(`/orders/settlements/${id}/settle`, {});
    return { success: true };
  },

  // ─── Bulk operations ─────────────────────────────────────────────────────────

  bulkDeleteCustomers: async (ids: string[]) => {
    await http.post('/customers/bulk-delete', { ids });
    return { success: true };
  },

  bulkUpdateCustomerStatus: async (ids: string[], status: string) => {
    await http.post('/customers/bulk-status', { ids, status });
    return { success: true };
  },

  bulkDeleteProducts: async (ids: string[]) => {
    await http.post('/products/bulk-delete', { ids });
    return { success: true };
  },

  bulkUpdateProductStatus: async (ids: string[], status: string) => {
    await http.post('/products/bulk-status', { ids, status });
    return { success: true };
  },

  bulkDeleteVendors: async (ids: string[]) => {
    await http.post('/vendors/bulk-delete', { ids });
    return { success: true };
  },

  bulkUpdateVendorStatus: async (ids: string[], status: string) => {
    await http.post('/vendors/bulk-status', { ids, status });
    return { success: true };
  },

  bulkDeleteServices: async (ids: string[]) => {
    await http.post('/services/bulk-delete', { ids });
    return { success: true };
  },

  bulkUpdateServiceStatus: async (ids: string[], status: string) => {
    await http.post('/services/bulk-status', { ids, status });
    return { success: true };
  },

  bulkDeleteCategories: async (ids: string[]) => {
    await http.post('/categories/bulk-delete', { ids });
    return { success: true };
  },

  bulkUpdateOrderStatus: async (ids: string[], status: string) => {
    await http.post('/orders/bulk-status', { ids, status });
    return { success: true };
  },

  bulkUpdateClassifiedStatus: async (ids: string[], status: string) => {
    await http.post('/classifieds/bulk-status', { ids, status });
    return { success: true };
  },

  bulkSettleSettlements: async (ids: string[]) => {
    await http.post('/orders/settlements/bulk-settle', { ids });
    return { success: true };
  },

  // ─── Classified Ads ──────────────────────────────────────────────────────────

  getClassifiedAds: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<ClassifiedAd>('/classifieds', params);
  },

  updateClassifiedStatus: async (id: string, status: ClassifiedAd['status']) => {
    await http.patch(`/classifieds/${id}`, { status });
    return { success: true };
  },

  postClassifiedAd: async (data: { title: string; description: string; price: number; category: string; city: string; area: string; images?: string[] }) => {
    const ad = await http.post<ClassifiedAd>('/classifieds', data);
    return { success: true, ad };
  },

  getCustomerClassifieds: async (_userId: string) => {
    return http.get<ClassifiedAd[]>('/classifieds/mine');
  },

  getBrowseClassifieds: async (params: { category?: string; search?: string }) => {
    return http.get<ClassifiedAd[]>('/classifieds', { ...params, status: 'approved' } as any);
  },

  getClassifiedCategories: () => [] as { id: number; name: string }[],

  getClassifiedCategoriesAsync: async () => {
    return http.get<{ id: number; name: string }[]>('/classifieds/categories');
  },

  // ─── Points ──────────────────────────────────────────────────────────────────

  getPointsTransactions: async (params: { page?: number; per_page?: number; date_from?: string; date_to?: string }) => {
    return paginate<PointsTransaction>('/admin/points-transactions', params);
  },

  // ─── Referrals ───────────────────────────────────────────────────────────────

  getReferrals: async (params: { page?: number; per_page?: number; date_from?: string; date_to?: string }) => {
    return paginate<Referral>('/admin/referrals', params);
  },

  // ─── Categories ──────────────────────────────────────────────────────────────

  getCategories: async () => {
    return http.get<Category[]>('/categories');
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    await http.patch(`/categories/${id}`, data);
    return { success: true };
  },

  createCategory: async (data: Partial<Category>) => {
    const category = await http.post<Category>('/categories', data);
    return { success: true, category };
  },

  deleteCategory: async (id: string) => {
    await http.delete(`/categories/${id}`);
    return { success: true };
  },

  // ─── CMS / Banners ───────────────────────────────────────────────────────────

  getBanners: async () => {
    return http.get<Banner[]>('/banners');
  },

  updateBanner: async (id: string, data: Partial<Banner>) => {
    await http.patch(`/banners/${id}`, data);
    return { success: true };
  },

  // ─── Platform Variables ──────────────────────────────────────────────────────

  getPlatformVariables: async () => {
    return http.get<PlatformVariable[]>('/master/platform-variables');
  },

  updatePlatformVariable: async (id: string, value: string) => {
    await http.patch(`/master/platform-variables/${id}`, { value });
    return { success: true };
  },

  // ─── Occupations ─────────────────────────────────────────────────────────────

  getOccupations: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    return paginate<Occupation>('/occupations', params);
  },

  updateOccupation: async (id: string, data: Partial<Occupation>) => {
    await http.patch(`/occupations/${id}`, data);
    return { success: true };
  },

  createOccupation: async (data: Partial<Occupation>) => {
    const occupation = await http.post<Occupation>('/occupations', data);
    return { success: true, occupation };
  },

  deleteOccupation: async (id: string) => {
    await http.delete(`/occupations/${id}`);
    return { success: true };
  },

  getActiveOccupations: async () => {
    return http.get<{ id: string; name: string }[]>('/occupations', { status: 'active', per_page: 1000 } as any);
  },

  // ─── Geography ───────────────────────────────────────────────────────────────

  getStates: async () => {
    return http.get<{ id: string; name: string; code: string }[]>('/states');
  },

  getDistricts: async (stateId: string) => {
    return http.get<{ id: string; name: string; state_id: string }[]>('/districts', { state_id: stateId } as any);
  },

  getCities: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    return paginate<City>('/cities', params);
  },

  getAreas: async (params: { page?: number; per_page?: number; search?: string; status?: string; city_id?: string }) => {
    return paginate<Area>('/areas', params);
  },

  // ─── Tax Config ──────────────────────────────────────────────────────────────

  getTaxConfig: async (params: { page?: number; per_page?: number; status?: string }) => {
    return paginate<TaxConfig>('/master/tax-configs', params);
  },

  // ─── Popup Banners ───────────────────────────────────────────────────────────

  getPopupBanners: async (params: { page?: number; per_page?: number; status?: string }) => {
    return paginate<PopupBanner>('/admin/popups', params);
  },

  // ─── Advertisements ──────────────────────────────────────────────────────────

  getAdvertisements: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<Advertisement>('/admin/ads', params);
  },

  // ─── Website Queries ─────────────────────────────────────────────────────────

  getWebsiteQueries: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<WebsiteQuery>('/admin/queries', params);
  },

  updateWebsiteQueryStatus: async (id: string, status: WebsiteQuery['status']) => {
    await http.patch(`/admin/queries/${id}`, { status });
    return { success: true };
  },

  // ─── Report Log ──────────────────────────────────────────────────────────────

  getReportLog: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<ReportLog>('/admin/property-reports', params);
  },

  // ─── Customer-facing APIs ────────────────────────────────────────────────────

  getCustomerHome: async () => {
    return http.get<any>('/content/home', undefined, { auth: false });
  },

  browseProducts: async (params: { category?: string; search?: string; sort?: string; userLat?: number; userLng?: number }) => {
    return http.get<Product[]>('/catalog/products', params as any, { auth: false });
  },

  getCustomerOrders: async (_customerId: string) => {
    // Backend reads customer from JWT — customerId param unused
    return http.get<Order[]>('/orders/mine');
  },

  getCustomerProfile: async (_customerId: string) => {
    return http.get<any>('/customers/me');
  },

  // ─── Cart (localStorage — keep as-is, no backend dependency) ─────────────────

  getCart: async (): Promise<CartItem[]> => {
    const { loadCart } = await import('./persist');
    return loadCart();
  },

  addToCart: async (product: Product, qty: number = 1) => {
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart();
    const existing = cart.find((i: CartItem) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id, title: product.title, price: product.price, qty,
        vendor: product.vendor_name || '', vendor_id: product.vendor_id,
        emoji: product.emoji || '📦', image: product.image || '',
        maxPoints: product.max_points_redeemable,
        tax: product.tax, discount: product.discount,
      });
    }
    saveCart(cart);
    return { success: true, cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0) };
  },

  updateCartItem: async (itemId: string, qty: number) => {
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart();
    const idx = cart.findIndex((i: CartItem) => i.id === itemId);
    if (idx >= 0) {
      if (qty <= 0) cart.splice(idx, 1);
      else cart[idx].qty = qty;
    }
    saveCart(cart);
    return { success: true };
  },

  removeFromCart: async (itemId: string) => {
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart().filter((i: CartItem) => i.id !== itemId);
    saveCart(cart);
    return { success: true };
  },

  clearCart: async () => {
    const { saveCart } = await import('./persist');
    saveCart([]);
    return { success: true };
  },

  // ─── Vendor-facing APIs ──────────────────────────────────────────────────────

  getVendorDashboard: async (_vendorId: string) => {
    return http.get<any>('/vendor/dashboard');
  },

  getVendorProducts: async (_vendorId: string) => {
    return http.get<Product[]>('/vendor/products');
  },

  getVendorOrders: async (_vendorId: string) => {
    return http.get<Order[]>('/vendor/orders');
  },

  getVendorSettlements: async (_vendorId: string) => {
    return http.get<Settlement[]>('/vendor/settlements');
  },

  getVendorProfile: async (_vendorId: string) => {
    return http.get<any>('/vendor/profile');
  },

  // ─── Reports ─────────────────────────────────────────────────────────────────

  getSalesReport: async (params: any) => {
    return http.get<any>('/admin/reports/orders', params);
  },

  getVendorPerformance: async (params: any) => {
    return http.get<any>('/admin/reports/vendor-performance', params);
  },

  getSettlementReport: async (params: any) => {
    return http.get<any>('/admin/reports/settlements', params);
  },

  getCustomerReport: async (params: any) => {
    return http.get<any>('/admin/reports/customers', params);
  },

  getPointsReport: async (params: any) => {
    return http.get<any>('/admin/reports/points', params);
  },

  getReferralReport: async (params: any) => {
    return http.get<any>('/admin/reports/referrals', params);
  },

  // ─── Support Tickets ─────────────────────────────────────────────────────────

  getSupportTickets: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    return paginate<any>('/admin/support-tickets', params);
  },

  resolveTicket: async (id: string, status: string, resolution: string) => {
    await http.patch(`/admin/support-tickets/${id}`, { status, resolution_notes: resolution });
    return { success: true };
  },

  createSupportTicket: async (data: { subject: string; description: string; category: string; priority: string; customer_id: string }) => {
    const ticket = await http.post<any>('/support-tickets', data);
    return { success: true, ticket };
  },

  // ─── Misc ─────────────────────────────────────────────────────────────────────

  resetData: () => {
    localStorage.clear();
    window.location.reload();
  },

  exportCSV: async (_type: string, _params: any) => {
    return { url: '#' };
  },
};
