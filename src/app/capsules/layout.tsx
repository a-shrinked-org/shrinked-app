"use client";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import React from "react";

export default function CapsuleLayout({ children }: React.PropsWithChildren) {
  return <AuthenticatedLayout layoutKey="capsule-layout">{children}</AuthenticatedLayout>;
}