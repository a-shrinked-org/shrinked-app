"use client";

import { Refine, NotificationProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider } from "next-auth/react";
import React from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@styles/global.css";

const notificationProvider: NotificationProvider = {
  open: ({ message, description, type, key }) => {
    const content = description ? `${message}: ${description}` : message;
    const toastId = key ? String(key) : undefined;
    
    if (toastId && toast.isActive(toastId)) {
      toast.update(toastId, {
        render: content,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 3000,
      });
    } else {
      toast(content, {
        toastId: toastId,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 3000,
      });
    }
  },
  close: (key) => {
    if (key) {
      toast.dismiss(String(key));
    }
  },
};

const App = (props: React.PropsWithChildren<{}>) => {
  return (
    <RefineKbarProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={customAuthProvider}
          notificationProvider={notificationProvider}
          resources={[
            {
              name: "jobs",
              list: "/jobs",
              create: "/jobs/create",
              edit: "/jobs/edit/:id",
              show: "/jobs/show/:id",
              meta: {
                canDelete: true,
              },
            },
            {
              name: "categories",
              list: "/categories",
              create: "/categories/create",
              edit: "/categories/edit/:id",
              show: "/categories/show/:id",
              meta: {
                canDelete: true,
              },
            },
            {
              name: "output",
              list: "/output",
              show: "/output/show/:id",
              meta: {
                canDelete: true,
              },
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true,
            disableTelemetry: true,
            reactQuery: {
              clientConfig: {
                suspense: true,
              },
            },
          }}
        >
          <Suspense fallback={<div>Loading...</div>}>
            {props.children}
          </Suspense>
          <RefineKbar />
          <ToastContainer />
        </Refine>
      </Suspense>
    </RefineKbarProvider>
  );
};

export const RefineContext = (props: React.PropsWithChildren<{}>) => {
  return (
    <SessionProvider>
      <App {...props} />
    </SessionProvider>
  );
};

export default RefineContext;