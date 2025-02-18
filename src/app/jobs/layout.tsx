"use client";

import { Layout as BaseLayout } from "@components/layout";
import React from "react";

export default function Layout({ children }: React.PropsWithChildren) {
  return <BaseLayout>{children}</BaseLayout>;
}