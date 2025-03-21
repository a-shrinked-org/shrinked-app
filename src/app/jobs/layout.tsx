"use client";

import { Layout as BaseLayout } from "@components/layout";
import { Authenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { authUtils } from "@/utils/authUtils";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Loading...</div>
    </div>
  );
}

function RedirectToLogin() {
  const router = useRouter();
  
  useEffect(() => {
    // Use a small timeout to prevent redirect loops
    const timeoutId = setTimeout(() => {
      // Log auth state before redirect
      if (typeof window !== 'undefined' && window._debugAuthState) {
        window._debugAuthState("Redirecting from jobs to login");
      }
      router.push('/login');
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  return <LoadingFallback />;
}

export default function JobsLayout({ children }: React.PropsWithChildren) {
  // Add debug on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window._debugAuthState) {
      window._debugAuthState("Jobs layout mounted");
    }
    
    // Check authentication state on mount
    const isAuthenticated = authUtils.isAuthenticated();
    console.log("Jobs layout authentication check:", isAuthenticated);
    
    // Initialize auth state on mount if authenticated
    if (isAuthenticated && typeof window !== 'undefined') {
      // Ensure user profile is loaded
      authUtils.ensureUserProfile().catch(console.error);
      // Set authenticated state
      authUtils.setAuthenticatedState(true);
    }
  }, []);

  return (
    <Authenticated
      key="jobs-layout"
      v3LegacyAuthProviderCompatible
      loading={<LoadingFallback />}
      fallback={<RedirectToLogin />}
      // Don't specify redirectOnFail at all - use the fallback component instead
    >
      <BaseLayout>{children}</BaseLayout>
    </Authenticated>
  );
}