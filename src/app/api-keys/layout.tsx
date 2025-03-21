"use client";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import React from "react";

export default function ApiKeysLayout({ children }: React.PropsWithChildren) {
  return <AuthenticatedLayout layoutKey="api-keys-layout">{children}</AuthenticatedLayout>;
}