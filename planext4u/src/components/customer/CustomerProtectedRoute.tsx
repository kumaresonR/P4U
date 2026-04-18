import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { tokenStore } from "@/lib/apiClient";

export function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customerUser, isLoading } = useAuth();
  const [checkingSession, setCheckingSession] = useState(!customerUser && !isLoading);

  useEffect(() => {
    if (!customerUser && !isLoading) {
      // Double-check for a stored JWT token before redirecting
      const token = tokenStore.getAccess();
      if (!token) {
        setCheckingSession(false);
      } else {
        // Token exists but customerUser not yet hydrated — keep waiting briefly
        const timeout = setTimeout(() => setCheckingSession(false), 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [customerUser, isLoading]);

  if (isLoading || (checkingSession && !customerUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!customerUser) {
    const savedRaw = localStorage.getItem('p4u_user');
    const hasToken = !!tokenStore.getAccess() || !!tokenStore.getRefresh();
    if (savedRaw && hasToken) {
      try {
        const saved = JSON.parse(savedRaw);
        if (saved?.portal === 'customer') return <>{children}</>;
      } catch { /* ignore */ }
    }
    return <Navigate to="/app/login" replace />;
  }

  return <>{children}</>;
}
