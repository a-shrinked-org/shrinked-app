"use client";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import React from "react";

export default function OutputLayout({ children }: React.PropsWithChildren) {
  return <AuthenticatedLayout layoutKey="output-layout">{children}</AuthenticatedLayout>;
}