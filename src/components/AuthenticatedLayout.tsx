"use client";

import { Layout as BaseLayout } from "@components/layout";
import { Authenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";



function RedirectToLogin() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/login');
  }, [router]);

  return null;
}

export default function AuthenticatedLayout({ 
  children,
  layoutKey = "authenticated-layout" 
}: React.PropsWithChildren<{ layoutKey?: string }>) {
  return (
    <Authenticated
      key={layoutKey}
      v3LegacyAuthProviderCompatible
      loading={<LoadingFallback />}
      fallback={<RedirectToLogin />}
      redirectOnFail="/login"
    >
      <BaseLayout>{children}</BaseLayout>
    </Authenticated>
  );
}