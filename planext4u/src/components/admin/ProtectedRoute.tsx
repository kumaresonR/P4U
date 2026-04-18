import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { tokenStore } from "@/lib/apiClient";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Fallback: if tokens/user exist in storage but context hasn't hydrated, treat as authenticated
  if (!isAuthenticated) {
    const savedRaw = localStorage.getItem('p4u_user');
    const hasToken = !!tokenStore.getAccess() || !!tokenStore.getRefresh();
    if (savedRaw && hasToken) {
      try {
        const saved = JSON.parse(savedRaw);
        if (saved?.portal === 'admin') return <>{children}</>;
      } catch { /* ignore */ }
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
