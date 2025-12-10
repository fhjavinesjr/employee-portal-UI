"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/header/Header";
import React, { useEffect, useState } from "react";

export default function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [ready, setReady] = useState(false); // tracks when we can render

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const publicPages = ["/employee-portal/login", "/employee-portal/registration"];

    if (!loggedIn && !publicPages.includes(pathname)) {
      router.replace("/employee-portal/login");
      return; // stop further rendering
    }

    setReady(true); // safe to render now
  }, [pathname, router]);

  // Render nothing until ready
  if (!ready) return null;

  // Hide layout for login and registration
  const publicPages = ["/employee-portal/login", "/employee-portal/registration"];
  const hideLayout = publicPages.includes(pathname);

  if (hideLayout) {
    return <main style={{ padding: 20 }}>{children}</main>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: 240,
          flex: "0 0 240px",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 1000,
        }}
      >
        <Sidebar />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ paddingTop: 10, flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
