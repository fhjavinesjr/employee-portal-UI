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
  "/employee-portal/notifications",
]);

const FEATURE_ROUTES: Array<[string, string]> = [
  ["/employee-portal/selfservice/LeaveApplication", "ep.leaveApp"],
  ["/employee-portal/selfservice/OvertimeRequest", "ep.overtimeReq"],
  ["/employee-portal/selfservice/Compensatory-Overtime-Credits", "ep.coc"],
  ["/employee-portal/selfservice/CompensatoryTimeOff", "ep.cto"],
  ["/employee-portal/selfservice/OfficialEngagement", "ep.officialEngag"],
  ["/employee-portal/selfservice/PassSlip", "ep.passSlip"],
  ["/employee-portal/selfservice/TimeCorrection", "ep.timeCorrection"],
  ["/employee-portal/selfservice/SALN", "ep.saln"],
  ["/employee-portal/selfservice/MyPerformanceCommitments", "primehr.individual-performance-commitment"],
  ["/employee-portal/selfservice/MyPerformanceMonitoring", "primehr.performance-monitoring"],
  ["/employee-portal/selfservice/MyPerformanceRatings", "primehr.performance-rating"],
  ["/employee-portal/selfservice/MyPerformanceReports", "primehr.performance-form-report"],
  ["/employee-portal/selfservice/MyLearning", "primehr.ld-needs"],
  ["/employee-portal/selfservice/MyRecognitions", "primehr.rr-nomination"],
  ["/employee-portal/selfservice/MyCareerDevelopment", "primehr.succession-pool"],
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
      ? feature[0].endsWith("/MyPerformanceRatings")
        ? ["primehr.performance-rating", "primehr.performance-appeal", "primehr.performance-intervention"]
            .some((key) => canAccessPortalFeature(permissions, key))
        : feature[0].endsWith("/MyPerformanceReports")
          ? ["primehr.performance-form-report", "primehr.performance-monitoring-report"]
              .some((key) => canAccessPortalFeature(permissions, key))
        : feature[0].endsWith("/MyLearning")
          ? ["primehr.ld-needs", "primehr.ld-individual-plan", "primehr.ld-nomination",
              "primehr.ld-evaluation", "primehr.ld-report"]
              .some((key) => canAccessPortalFeature(permissions, key))
        : feature[0].endsWith("/MyRecognitions")
          ? ["primehr.rr-nomination", "primehr.rr-award", "primehr.rr-report"]
              .some((key) => canAccessPortalFeature(permissions, key))
        : feature[0].endsWith("/MyCareerDevelopment")
          ? ["primehr.succession-pool", "primehr.succession-readiness", "primehr.succession-development", "primehr.succession-report"]
              .some((key) => canAccessPortalFeature(permissions, key))
        : canAccessPortalFeature(permissions, feature[1])
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
