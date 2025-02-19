"use client";
import AuthPage from "@components/auth-page";
import { useIsAuthenticated } from "@refinedev/core";
import { redirect } from "next/navigation";

export default async function Login() {
  const data = await getData();

  if (data.authenticated) {
    redirect(data?.redirectTo || "/");
  }

  // return <h1>Hello</h1>;

  return <AuthPage type="login" />;
}

async function getData() {
  const { authenticated, redirectTo, error } = useIsAuthenticated();

  return {
    authenticated,
    redirectTo,
    error,
  };
}