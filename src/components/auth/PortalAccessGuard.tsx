"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  canAccessPortalFeature,
  loadPortalPermissions,
} from "@/lib/utils/portalPermissions";

const PUBLIC_PATHS = new Set([
  "/employee-portal/login",
  "/employee-portal/activate",
  "/employee-portal/registration",
]);

const ALWAYS_AVAILABLE_PATHS = new Set([
  "/employee-portal/dashboard",
  "/employee-portal/profile",
  "/employee-portal/changepassword",
]);

const FEATURE_ROUTES: Array<[string, string]> = [
  ["/employee-portal/selfservice/LeaveApplication", "ep.leaveApp"],
  ["/employee-portal/selfservice/OvertimeRequest", "ep.overtimeReq"],
  ["/employee-portal/selfservice/Compensatory-Overtime-Credits", "ep.coc"],
  ["/employee-portal/selfservice/CompensatoryTimeOff", "ep.cto"],
  ["/employee-portal/selfservice/OfficialEngagement", "ep.officialEngag"],
  ["/employee-portal/selfservice/PassSlip", "ep.passSlip"],
  ["/employee-portal/selfservice/TimeCorrection", "ep.timeCorrection"],
];

export default function PortalAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(
    PUBLIC_PATHS.has(pathname) || ALWAYS_AVAILABLE_PATHS.has(pathname) ? pathname : null,
  );

  const verifyAccess = useCallback(async () => {
    if (PUBLIC_PATHS.has(pathname) || ALWAYS_AVAILABLE_PATHS.has(pathname)) {
      setAuthorizedPath(pathname);
      return;
    }

    // Keep an already-authorized page mounted during focus/visibility
    // revalidation. Unmounting it here resets every local tab, form, filter,
    // and pagination state to its first/default value. A newly navigated path
    // still starts hidden because its value differs from authorizedPath.
    setAuthorizedPath((current) => current === pathname ? current : null);
    const permissions = await loadPortalPermissions(true);
    const feature = FEATURE_ROUTES.find(([route]) => pathname.startsWith(route));
    const routeAllowed = feature
      ? canAccessPortalFeature(permissions, feature[1])
      : pathname.startsWith("/employee-portal/workforce-structure/")
        ? permissions.hasAssignedRole
        : permissions.hasAssignedRole;

    if (routeAllowed) {
      setAuthorizedPath(pathname);
    } else {
      router.replace("/employee-portal/dashboard");
    }
  }, [pathname, router]);

  useEffect(() => {
    const handleFocus = () => void verifyAccess();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void verifyAccess();
    };
    void verifyAccess();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [verifyAccess]);

  return authorizedPath === pathname ? <>{children}</> : null;
}
