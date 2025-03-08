// pages/index.tsx
"use client";

import { Authenticated, useIsAuthenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GradientLoader } from "@/components/GradientLoader"; // Adjust path as needed

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
        <GradientLoader width={200} height={4} />
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