"use client";

import { useEffect, ReactNode, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isLoginPage = pathname === "/employee-portal/login";

    if (!loggedIn && !isLoginPage) {
      router.replace("/employee-portal/login");
    } else {
      setChecking(false);
    }
  }, [router, pathname]);

  if (checking) return null;

  return <>{children}</>;
}
