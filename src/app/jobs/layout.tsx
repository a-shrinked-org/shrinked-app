"use client";

import { Authenticated } from "@refinedev/core";
import { Layout as BaseLayout } from "@components/layout";
import React from "react";

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <Authenticated 
      key="jobs-layout"
      v3LegacyAuthProviderCompatible
      fallback={<div>Redirecting to login...</div>}
    >
      <BaseLayout>{children}</BaseLayout>
    </Authenticated>
  );
}