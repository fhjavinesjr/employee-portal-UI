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
    let isRedirecting = false; // Prevent multiple redirects

    const refreshActivity = () => {
      localStorage.setItem("lastActivity", Date.now().toString());
    };

    const checkExpiration = () => {
      if (isRedirecting) return;

      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const lastActivity = Number(localStorage.getItem("lastActivity") || 0);
      const now = Date.now();

      // If logged in but inactive
      if (loggedIn && now - lastActivity > INACTIVITY_LIMIT) {
        localStorage.setItem("isLoggedIn", "false");
        localStorage.removeItem("lastActivity");

        if (!PUBLIC_PAGES.includes(pathname)) {
          isRedirecting = true;
          router.replace("/employee-portal/login");
        }
        return true;
      }

      // If not logged in and trying to access protected page
      if (!loggedIn && !PUBLIC_PAGES.includes(pathname)) {
        isRedirecting = true;
        router.replace("/employee-portal/login");
        return true;
      }

      setChecking(false);
      return false;
    };

    // Initial check
    checkExpiration();
    refreshActivity();

    const userEvents = ["click", "keypress", "mousemove", "scroll", "touchstart"];
    userEvents.forEach(event => window.addEventListener(event, refreshActivity));

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "isLoggedIn" && event.newValue !== "true") {
        if (!PUBLIC_PAGES.includes(pathname) && !isRedirecting) {
          isRedirecting = true;
          router.replace("/employee-portal/login");
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // Interval check for background tabs
    const interval = setInterval(() => {
      checkExpiration();
    }, 1000);

    return () => {
      userEvents.forEach(event => window.removeEventListener(event, refreshActivity));
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [router, pathname]);

  if (checking) return null;

  return <>{children}</>;
}
