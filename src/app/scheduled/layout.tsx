"use client";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import React from "react";

export default function ScheduledLayout({ children }: React.PropsWithChildren) {
  return <AuthenticatedLayout layoutKey="scheduled-layout">{children}</AuthenticatedLayout>;
}