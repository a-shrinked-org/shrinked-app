"use client";

import { Layout as BaseLayout } from "@components/layout";
import { Authenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import GradientLoader from "./GradientLoader";

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
    router.push('/login');
  }, [router]);

  return <LoadingFallback />;
}

export default function AuthenticatedLayout({ 
  children,
  layoutKey = "authenticated-layout" 
}: React.PropsWithChildren<{ layoutKey?: string }>) {
  return (
    <Authenticated
      key={layoutKey}
      v3LegacyAuthProviderCompatible
      fallback={<RedirectToLogin />}
      redirectOnFail="/login"
    >
      <BaseLayout>{children}</BaseLayout>
    </Authenticated>
  );
}