import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api as http, tokenStore } from "@/lib/apiClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";
import { closeOAuthBrowser } from "@/lib/capacitor-auth";

type CallbackStatus = "checking" | "linked" | "failed";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { customerUser, isLoading } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("checking");
  const [message, setMessage] = useState("Completing Google sign-in...");
  const [redirectPath, setRedirectPath] = useState("/app");

  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const error = url.searchParams.get("error") || url.hash.match(/error=([^&]+)/)?.[1];
        const errorDescription = url.searchParams.get("error_description") ||
          url.hash.match(/error_description=([^&]+)/)?.[1]?.replace(/\+/g, " ");
        if (error) throw new Error(decodeURIComponent(errorDescription || error));

        const code = url.searchParams.get("code");
        if (!code) throw new Error("Sign-in could not be completed. Please try again.");

        if (url.search || url.hash) {
          window.history.replaceState({}, document.title, "/auth/callback");
        }

        const data = await http.post<any>('/auth/google/callback', { code }, { auth: false } as any);

        if (!data?.success || !data?.access_token) {
          throw new Error(data?.error || "Your Gmail is not registered with Planext4U. Create your account first to do a Google Sign-in.");
        }

        if (cancelled) return;

        tokenStore.set(data.access_token, data.refresh_token || '');
        setRedirectPath(data?.has_address ? "/app" : "/app/set-location");
        setMessage(data?.has_address ? "Signing you in..." : "Taking you to location setup...");
        setStatus("linked");
        await closeOAuthBrowser();
      } catch (err: any) {
        console.error("Google auth callback failed:", err);
        await closeOAuthBrowser();

        if (!cancelled) {
          const errorMessage = err?.message || "Google sign-in failed. Please try again.";
          setStatus("failed");
          setMessage(errorMessage);
          toast.error(errorMessage, { duration: 6000 });
          window.setTimeout(() => navigate("/app/login", { replace: true }), 1800);
        }
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (status === "linked" && !isLoading && customerUser) {
      toast.success("Welcome to Planext4u!");
      navigate(redirectPath, { replace: true });
    }
  }, [status, isLoading, customerUser, navigate, redirectPath]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <img src={p4uLogoTeal} alt="Planext4u" className="h-16 w-16 object-contain rounded-xl" />
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">
        {status === "failed" ? "Redirecting to login..." : message}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
