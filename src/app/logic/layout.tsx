"use client";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import React from "react";

export default function LogicLayout({ children }: React.PropsWithChildren) {
  return <AuthenticatedLayout layoutKey="logic-layout">{children}</AuthenticatedLayout>;
}