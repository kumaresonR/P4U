import { useEffect, useState, ReactNode, useCallback } from "react";
import { AuthContext } from "@/lib/auth-context";
import { api, tokenStore } from "@/lib/apiClient";
import { initPushNotifications, linkPushTokenToUser, clearPushToken } from "@/lib/push-notifications";
import type { AuthUser, CustomerUser, VendorUser, UserRole } from "@/lib/auth-types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Restore session from localStorage on mount ──────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem('p4u_user');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.portal === 'admin') setUser(saved);
        else if (saved.portal === 'vendor') {
          setVendorUser({
            id: saved.id,
            vendor_id: saved.vendor_id || saved.id,
            name: saved.name || 'Vendor',
            email: saved.email || '',
            business_name: saved.business_name || '',
            portal: 'vendor',
          });
        } else if (saved.portal === 'customer') setCustomerUser(saved);
      }
    } catch { /* ignore */ }
    setIsLoading(false);

    // Listen for forced logout (e.g. token refresh failure)
    const onLogout = () => {
      setUser(null); setCustomerUser(null); setVendorUser(null);
    };
    window.addEventListener('p4u:logout', onLogout);
    return () => window.removeEventListener('p4u:logout', onLogout);
  }, []);

  // ─── Admin login ──────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data: any = await api.post('/auth/admin/login', { email, password }, { auth: false });
      tokenStore.set(data.access_token, data.refresh_token);

      const u = data.user || data.admin;
      const authUser: AuthUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        portal: 'admin',
      };
      setUser(authUser);
      localStorage.setItem('p4u_user', JSON.stringify(authUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Customer login ───────────────────────────────────────────────────────

  const customerLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data: any = await api.post('/auth/customer/login', { email, password }, { auth: false });
      tokenStore.set(data.access_token, data.refresh_token);

      const u = data.user || data.customer;
      const cu: CustomerUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile || '',
        customer_id: u.id,
        portal: 'customer',
      };
      setCustomerUser(cu);
      localStorage.setItem('p4u_user', JSON.stringify(cu));

      initPushNotifications(u.id);
      linkPushTokenToUser(u.id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Vendor login ─────────────────────────────────────────────────────────

  const vendorLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data: any = await api.post('/auth/vendor/login', { email, password, type: 'vendor' }, { auth: false });
      tokenStore.set(data.access_token, data.refresh_token);

      const u = data.user || data.vendor;
      const vu: VendorUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        business_name: u.business_name || '',
        vendor_id: u.id,
        portal: 'vendor',
      };
      setVendorUser(vu);
      localStorage.setItem('p4u_user', JSON.stringify(vu));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Logout helpers ───────────────────────────────────────────────────────

  const _clearAll = useCallback(() => {
    tokenStore.clear();
    setUser(null); setCustomerUser(null); setVendorUser(null);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    _clearAll();
  }, [_clearAll]);

  const customerLogout = useCallback(async () => {
    const id = customerUser?.id;
    if (id) clearPushToken(id).catch(() => {});
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    _clearAll();
  }, [customerUser, _clearAll]);

  const vendorLogout = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    _clearAll();
  }, [_clearAll]);

  // ─── Access control ───────────────────────────────────────────────────────

  const hasAccess = useCallback((allowedRoles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    return allowedRoles.includes(user.role);
  }, [user]);

  const seedDemoUsers = async () => {
    console.warn('seedDemoUsers: not applicable with custom backend');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customerUser,
        vendorUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        customerLogin,
        vendorLogin,
        logout,
        customerLogout,
        vendorLogout,
        hasAccess,
        seedDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
