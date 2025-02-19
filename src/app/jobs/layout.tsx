import authOptions from "@app/api/auth/[...nextauth]/options";
import { Layout as BaseLayout } from "@components/layout";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import React from "react";
import { Authenticated } from "@refinedev/core";

export default async function Layout({ children }: React.PropsWithChildren) {
  return (
  <Authenticated key="jobs-page" redirectOnFail="/login">
      <BaseLayout>
        {children}
      </BaseLayout>
  </Authenticated>);
}