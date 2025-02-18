"use client";

import { Layout as BaseLayout } from "@components/layout";
import { Authenticated } from "@refinedev/core";
import React from "react";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Loading...</div>
    </div>
  );
}

export default function JobsLayout({ children }: React.PropsWithChildren) {
  return (
    <Authenticated
      key="jobs-layout"
      v3LegacyAuthProviderCompatible
      loading={<LoadingFallback />}
      fallback={<LoadingFallback />}
      redirectOnFail="/login"
    >
      <BaseLayout>{children}</BaseLayout>
    </Authenticated>
  );
}