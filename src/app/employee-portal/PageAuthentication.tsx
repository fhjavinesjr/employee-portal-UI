"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface PageAuthenticationProps {
  children: React.ReactNode;
}

const PUBLIC_PAGES = ["/employee-portal/login", "/employee-portal/registration"];
const INACTIVITY_LIMIT = 1 * 60 * 1000; // 1 minute for testing

export default function PageAuthentication({ children }: PageAuthenticationProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // ---- REFRESH ACTIVITY TIMESTAMP ----
    const refreshActivity = () => {
      localStorage.setItem("lastActivity", Date.now().toString());
    };

    // ---- CHECK IF SESSION EXPIRED OR LOGGED OUT ----
    const checkExpiration = () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const lastActivity = Number(localStorage.getItem("lastActivity") || 0);
      const now = Date.now();

      // Expire if inactive
      if (loggedIn && lastActivity && now - lastActivity > INACTIVITY_LIMIT) {
        localStorage.setItem("isLoggedIn", "false");
        localStorage.removeItem("lastActivity");
        router.replace("/employee-portal/login");
        return true;
      }

      // Normal route protection
      if (!loggedIn && !PUBLIC_PAGES.includes(pathname)) {
        router.replace("/employee-portal/login");
        return true;
      }

      setChecking(false);
      return false;
    };

    // ---- INITIAL CHECK ----
    checkExpiration();
    refreshActivity();

    // ---- USER ACTIVITY LISTENERS ----
    const userEvents = ["click", "keypress", "mousemove", "scroll", "touchstart"];
    userEvents.forEach(event =>
      window.addEventListener(event, refreshActivity)
    );

    // ---- MULTI-TAB SYNC ----
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "isLoggedIn" && event.newValue !== "true") {
        router.replace("/employee-portal/login");
      }
      if (event.key === "lastActivity") {
        checkExpiration();
      }
    };
    window.addEventListener("storage", handleStorage);

    // ---- CLEANUP ----
    return () => {
      userEvents.forEach(event =>
        window.removeEventListener(event, refreshActivity)
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [router, pathname]);

  if (checking) return null; // prevent flashing

  return <>{children}</>;
}
