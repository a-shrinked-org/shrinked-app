"use client";

import { Authenticated, useIsAuthenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IndexPage() {
  const router = useRouter();
  const { data: isAuthenticated, isLoading } = useIsAuthenticated();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/jobs');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Authenticated 
      key="home-page"
      v3LegacyAuthProviderCompatible
      fallback={<div>Redirecting to login...</div>}
    >
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecting to dashboard...</div>
      </div>
    </Authenticated>
  );
}