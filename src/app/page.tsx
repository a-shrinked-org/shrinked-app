"use client";

import { Suspense } from "react";
import { Authenticated } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/jobs');
  }, [router]);

  return (
    <Suspense>
      <Authenticated key="home-page">
        <div>Redirecting...</div>
      </Authenticated>
    </Suspense>
  );
}