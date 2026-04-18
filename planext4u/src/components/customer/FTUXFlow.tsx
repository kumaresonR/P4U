import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { SplashScreen } from "./SplashScreen";
import { OnboardingCarousel } from "./OnboardingCarousel";
import { PermissionScreen } from "./PermissionScreen";
import { isNativePlatform } from "@/lib/capacitor";
import { api } from "@/lib/apiClient";

type FTUXStep = "splash" | "onboarding" | "permissions" | "done";

function getDeviceId(): string {
  let id = localStorage.getItem("p4u_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("p4u_device_id", id);
  }
  return id;
}

async function getNativeDeviceId(): Promise<string> {
  if (isNativePlatform()) {
    try {
      const mod = await import("@capacitor/core");
      const info = await (mod.Capacitor as any).Plugins?.Device?.getId();
      if (info?.identifier) {
        localStorage.setItem("p4u_device_id", info.identifier);
        return info.identifier;
      }
    } catch {}
  }
  return getDeviceId();
}

interface FTUXFlowProps {
  children: React.ReactNode;
  userId?: string;
}

// Paths that should skip the FTUX splash/onboarding (admin, vendor portals, auth pages)
const shouldSkipFTUX = (pathname: string): boolean => {
  if (pathname.startsWith("/app") || pathname === "/auth/callback") return false;
  return true;
};

export function FTUXFlow({ children, userId }: FTUXFlowProps) {
  const location = useLocation();
  const skipFTUX = shouldSkipFTUX(location.pathname);
  const [step, setStep] = useState<FTUXStep>(skipFTUX ? "done" : "splash");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (skipFTUX) return;
    const checkOnboarding = async () => {
      const deviceId = await getNativeDeviceId();

      if (userId) {
        try {
          const data: any = await api.get(`/auth/device-onboarding`, { user_id: userId, device_id: deviceId } as any);
          if (!data || !data.onboarding_completed) {
            setNeedsOnboarding(true);
            // Register device record
            api.post('/auth/device-onboarding', {
              user_id: userId,
              device_id: deviceId,
              platform: isNativePlatform() ? "android" : "web",
              onboarding_completed: false,
            }).catch(() => {});
          }
        } catch {
          // If endpoint doesn't exist yet, fall back to localStorage
          const completed = localStorage.getItem("p4u_onboarding_completed");
          if (!completed) setNeedsOnboarding(true);
        }
      } else {
        // Not logged in — check local flag
        const completed = localStorage.getItem("p4u_onboarding_completed");
        if (!completed) setNeedsOnboarding(true);
      }
    };
    checkOnboarding();
  }, [userId, skipFTUX]);

  const handleSplashComplete = useCallback(() => {
    if (needsOnboarding) {
      setStep("onboarding");
    } else {
      setStep("done");
    }
  }, [needsOnboarding]);

  const handleOnboardingComplete = useCallback(async () => {
    localStorage.setItem("p4u_onboarding_completed", "true");
    const deviceId = getDeviceId();

    if (userId) {
      api.patch('/auth/device-onboarding', { user_id: userId, device_id: deviceId, onboarding_completed: true }).catch(() => {});
    }

    if (isNativePlatform() && !localStorage.getItem("p4u_permissions_asked")) {
      setStep("permissions");
    } else {
      setStep("done");
    }
  }, [userId]);

  const handlePermissionsComplete = useCallback(() => {
    setStep("done");
  }, []);

  if (step === "splash") {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (step === "onboarding") {
    return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
  }

  if (step === "permissions") {
    return <PermissionScreen onComplete={handlePermissionsComplete} />;
  }

  return <>{children}</>;
}
