"use client";

import { Layout as BaseLayout } from "@components/layout";
import { Authenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

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

export default function ApiKeysLayout({ children }: React.PropsWithChildren) {
  return (
    <Authenticated
      key="api-keys-layout"
      v3LegacyAuthProviderCompatible
      loading={<LoadingFallback />}
      fallback={<RedirectToLogin />}
      redirectOnFail="/login"
    >
      <BaseLayout>{children}</BaseLayout>
    </Authenticated>
  );
}