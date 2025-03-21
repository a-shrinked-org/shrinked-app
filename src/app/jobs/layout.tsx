"use client";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import React from "react";

export default function JobsLayout({ children }: React.PropsWithChildren) {
  return <AuthenticatedLayout layoutKey="jobs-layout">{children}</AuthenticatedLayout>;
}