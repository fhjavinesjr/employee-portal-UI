"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/header/Header";
import React from "react";

interface LayoutClientWrapperProps {
  children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const pathname = usePathname() || "";

  // Pages where we want to hide sidebar/header
  const publicPages = ["/employee-portal/login", "/employee-portal/registration"];
  const hideLayout = publicPages.includes(pathname);

  if (hideLayout) {
    // For login/registration: show only content
    return <main style={{ padding: 20 }}>{children}</main>;
  }

  // For protected pages: show sidebar + header
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 1000,
        }}
      >
        <Sidebar />
      </aside>

      {/* Main content with header */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ paddingTop: 10, flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
