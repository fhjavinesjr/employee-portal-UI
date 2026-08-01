"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MenuItem } from "./MenuItem";
import styles from "@/styles/DashboardSidebar.module.scss";
import { usePathname } from "next/navigation";
import Swal from "sweetalert2";

import { FaHome, FaUserFriends } from "react-icons/fa";
import { MdAccessTime, MdOutlineMiscellaneousServices } from "react-icons/md";
import { HiViewGrid, HiOfficeBuilding } from "react-icons/hi";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { localStorageUtil, type PortalModuleAccess } from "@/lib/utils/localStorageUtil";


type PortalModuleKey = keyof PortalModuleAccess;
type SsoTarget = "administrative" | "hrm" | "timekeeping" | "payroll";

type SidebarMenuItem = Pick<
  React.ComponentProps<typeof MenuItem>,
  "icon" | "label" | "goto"
> & {
  id: number;
  portalModule?: PortalModuleKey;
  ssoTarget?: SsoTarget;
};

type PermissionRuleset = {
  permissionId: number;
  permissionName: string;
  isAdministrator: boolean;
  portalModuleAccess?: string | PortalModuleAccess | null;
};

const NO_PORTAL_MODULE_ACCESS: PortalModuleAccess = {
  administrative: false,
  hrManagement: false,
  timeKeeping: false,
  payroll: false,
};

const ALL_PORTAL_MODULE_ACCESS: PortalModuleAccess = {
  administrative: true,
  hrManagement: true,
  timeKeeping: true,
  payroll: true,
};

const parsePortalModuleAccess = (
  value: PermissionRuleset["portalModuleAccess"]
): PortalModuleAccess => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return { ...NO_PORTAL_MODULE_ACCESS };
    const access = parsed as Partial<PortalModuleAccess>;
    return {
      administrative: access.administrative === true,
      hrManagement: access.hrManagement === true,
      timeKeeping: access.timeKeeping === true,
      payroll: access.payroll === true,
    };
  } catch {
    return { ...NO_PORTAL_MODULE_ACCESS };
  }
};

const menuItems: SidebarMenuItem[] = [
  {
    id: 1,
    icon: <FaHome />,
    label: "Dashboard",
    goto: "/employee-portal/dashboard",
  },
  {
    id: 2,
    icon: <HiViewGrid />,
    label: "Administrative",
    goto: "#",
    portalModule: "administrative",
    ssoTarget: "administrative",
  },
  {
    id: 3,
    icon: <FaUserFriends />,
    label: "HR Management",
    goto: "#",
    portalModule: "hrManagement",
    ssoTarget: "hrm",
  },
  {
    id: 4,
    icon: <MdAccessTime />,
    label: "Timekeeping",
    goto: "#",
    portalModule: "timeKeeping",
    ssoTarget: "timekeeping",
  },
  {
    id: 5,
    icon: <MdOutlineMiscellaneousServices />,
    label: "Payroll",
    goto: "#",
    portalModule: "payroll",
    ssoTarget: "payroll",
  },
];

const essItems = [
  {
    label: "Leave Application",
    path: "/employee-portal/selfservice/LeaveApplication",
  },
  {
    label: "Overtime Request",
    path: "/employee-portal/selfservice/OvertimeRequest",
  },
  {
    label: "Compensatory Overtime Credit",
    path: "/employee-portal/selfservice/Compensatory-Overtime-Credits",
  },
  {
    label: "Compensatory Time Off",
    path: "/employee-portal/selfservice/CompensatoryTimeOff",
  },
  {
    label: "Official Engagement",
    path: "/employee-portal/selfservice/OfficialEngagement",
  },
  {
    label: "Pass Slip",
    path: "/employee-portal/selfservice/PassSlip",
  },
  {
    label: "Time Correction",
    path: "/employee-portal/selfservice/TimeCorrection",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isESSRoute = pathname?.startsWith("/employee-portal/selfservice");
  const isWSMRoute = pathname?.startsWith("/employee-portal/workforce-structure");
  const [openESS, setOpenESS] = useState(isESSRoute);
  const [openWSM, setOpenWSM] = useState(isWSMRoute);
  const [isApprover, setIsApprover] = useState(false);
  const [isInWorkflow, setIsInWorkflow] = useState(false);
  const [portalModuleAccess, setPortalModuleAccess] = useState<PortalModuleAccess>({ ...NO_PORTAL_MODULE_ACCESS });
  const [launchingTarget, setLaunchingTarget] = useState<SsoTarget | null>(null);

  const launchSso = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: SsoTarget
  ) => {
    event.preventDefault();
    if (launchingTarget) return;

    setLaunchingTarget(target);
    try {
      const response = await fetchWithAuth(
        `${runtimeConfig.getApiUrl("administrative")}/api/sso/launch`,
        { method: "POST", body: JSON.stringify({ target }) }
      );
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as
          | { detail?: string; message?: string }
          | null;
        throw new Error(errorBody?.detail ?? errorBody?.message ?? "You are not allowed to open this module.");
      }

      const launch = await response.json() as { code: string };
      const destinations: Record<SsoTarget, { app: Parameters<typeof runtimeConfig.getUiUrl>[0]; path: string }> = {
        administrative: { app: "administrative", path: "/administrative/sso" },
        hrm: { app: "hrm", path: "/hr-management/sso" },
        timekeeping: { app: "timekeeping", path: "/time-keeping/sso" },
        payroll: { app: "payroll", path: "/payroll-management/sso" },
      };
      const destination = destinations[target];
      const callbackUrl = new URL(destination.path, runtimeConfig.getUiUrl(destination.app));
      callbackUrl.hash = new URLSearchParams({ code: launch.code }).toString();
      window.location.assign(callbackUrl.toString());
    } catch (error) {
      setLaunchingTarget(null);
      await Swal.fire({
        title: "Unable to open module",
        text: error instanceof Error ? error.message : "Single sign-on failed.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Employee info state
  const [empInfo, setEmpInfo] = useState({
    photo: "/default-avatar.jpg",
    fullName: "",
    employeeNo: "",
    position: "",
    businessUnit: "",
  });

  // Keep ESS open if pathname is inside self-service
useEffect(() => {
  setOpenESS(isESSRoute);
}, [isESSRoute]);

// Keep WSM open if pathname is inside workforce-structure
useEffect(() => {
  setOpenWSM(isWSMRoute);
}, [isWSMRoute]);

  // Resolve the current permission ruleset and map its top-level Portal flags.
  // Cached flags avoid unnecessary menu flicker, while the backend remains the
  // source of truth and refreshes the cache whenever the sidebar mounts.
  useEffect(() => {
    let cancelled = false;
    const storedRole = localStorageUtil.getEmployeeRole()?.trim();
    if (!storedRole) {
      localStorageUtil.clearPortalModuleAccess();
      setPortalModuleAccess({ ...NO_PORTAL_MODULE_ACCESS });
      return () => { cancelled = true; };
    }

    const cached = localStorageUtil.getPortalModuleAccess(storedRole);
    if (cached) setPortalModuleAccess(cached);

    const loadPortalModuleAccess = async () => {
      try {
        const response = await fetchWithAuth(`${runtimeConfig.getApiUrl("administrative")}/api/permission/get-all`);
        if (!response.ok) throw new Error(`Unable to load permissions (${response.status})`);

        const rulesets = await response.json() as PermissionRuleset[];
        const normalizedRole = storedRole.replace(/^ROLE_/i, "").toUpperCase();
        const ruleset = rulesets.find((item) =>
          String(item.permissionId) === storedRole ||
          item.permissionName?.trim().toUpperCase() === normalizedRole
        );

        if (!ruleset) throw new Error("The current permission ruleset was not found");

        const access = ruleset.isAdministrator
          ? { ...ALL_PORTAL_MODULE_ACCESS }
          : parsePortalModuleAccess(ruleset.portalModuleAccess);

        if (cancelled) return;
        setPortalModuleAccess(access);
        localStorageUtil.setPortalModuleAccess(access, storedRole);
      } catch (error) {
        console.error("Unable to refresh Portal module permissions", error);
        if (!cancelled && !cached) {
          setPortalModuleAccess({ ...NO_PORTAL_MODULE_ACCESS });
        }
      }
    };

    void loadPortalModuleAccess();
    return () => { cancelled = true; };
  }, []);

  // Fetch employee info for the sidebar card
  useEffect(() => {
    const employeeId = localStorageUtil.getEmployeeId();
    const fullName = localStorageUtil.getEmployeeFullname() ?? "";
    const employeeNo = localStorageUtil.getEmployeeNo() ?? "";

    setEmpInfo(prev => ({ ...prev, fullName, employeeNo }));

    if (!employeeId) return;

    const API_HRM = runtimeConfig.getApiUrl("hrm");
    const API_ADMIN = runtimeConfig.getApiUrl("administrative");

    Promise.all([
      fetchWithAuth(`${API_HRM}/api/fetch/personal-data/${employeeId}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchWithAuth(`${API_HRM}/api/employeeAppointment/getLatestEmployeeAppointmentByEmployeeId/${employeeId}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchWithAuth(`${API_ADMIN}/api/job-position/get-all`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/manage-personnel/get-all`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/businessUnits/get-all`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/approval-workflow/get-all`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([personalData, appointment, jobPositions, personnel, businessUnits, workflows]) => {
      const photo = personalData?.employeePicture
        ? `data:image/jpeg;base64,${personalData.employeePicture}`
        : "/default-avatar.jpg";

      const jobPositionId = appointment?.jobPositionId;
      const position = (jobPositions as { jobPositionId: number; jobPositionName: string }[]).find(jp => jp.jobPositionId === jobPositionId)?.jobPositionName ?? "";

      const typedPersonnel = personnel as { employeeId: number | string; base: string; businessUnitId: number; head: boolean; coApprover: boolean }[];
      const typedWorkflows = workflows as { employeeId: number | string }[];

      const baseEntry = typedPersonnel.find(p => String(p.employeeId) === String(employeeId) && p.base?.toLowerCase() === "yes");
      const businessUnitId = baseEntry?.businessUnitId;
      const businessUnit = (businessUnits as { businessUnitsId: number; businessUnitsName: string }[]).find(bu => bu.businessUnitsId === businessUnitId)?.businessUnitsName ?? "";

      setEmpInfo({ photo, fullName, employeeNo, position, businessUnit });
      setIsApprover(!!baseEntry);

      // Direct approver: employee has their own workflow row
      const isDirectApprover = typedWorkflows.some(w => String(w.employeeId) === String(employeeId));

      // Co-approver: coApprover=true in base BU AND the head of that BU is in the workflow
      let isCoApproverAccess = false;
      if (!isDirectApprover && baseEntry?.coApprover) {
        const headIds = typedPersonnel
          .filter(p => p.businessUnitId === baseEntry.businessUnitId && p.head === true)
          .map(p => String(p.employeeId));
        isCoApproverAccess = headIds.length > 0 && typedWorkflows.some(w => headIds.includes(String(w.employeeId)));
      }

      setIsInWorkflow(isDirectApprover || isCoApproverAccess);
    }).catch(console.error);
  }, []);

// Arrow:
<span className={styles.dropdownArrow}>{openESS ? "▾" : "▸"}</span>

// Submenu Links:
{essItems.map((item) => (
  <Link
    key={item.path}
    href={item.path}
    className={`${styles.subMenuItem} ${
      pathname === item.path ? styles.activeSubMenuItem : ""
    }`}
  >
    {item.label}
  </Link>
))}

  return (
    <nav
      className={styles.Sidebar}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.brand}>
        <div className={styles.brandName}>
          EMPLOYEE
          <br />
          PORTAL
        </div>
      </div>

      {/* Employee Info Card */}
      {empInfo.fullName && (
        <div className={styles.employeeCard}>
          <Image
            src={empInfo.photo}
            alt="Profile"
            width={64}
            height={64}
            className={styles.avatar}
            unoptimized
          />
          <div className={styles.employeeName}>{empInfo.fullName}</div>
          {empInfo.employeeNo && (
            <div className={styles.employeeNo}>#{empInfo.employeeNo}</div>
          )}
          {empInfo.position && (
            <div className={styles.employeePosition}>{empInfo.position}</div>
          )}
          {empInfo.businessUnit && (
            <div className={styles.employeeUnit}>{empInfo.businessUnit}</div>
          )}
        </div>
      )}

      <div className={styles.menuSection}>
        {menuItems
          .filter((item) => !item.portalModule || portalModuleAccess[item.portalModule])
          .map((item) => (
          <MenuItem
            key={item.id}
            icon={item.icon}
            label={launchingTarget === item.ssoTarget ? `Opening ${item.label}...` : item.label}
            goto={item.goto}
            isActive={pathname === item.goto}
            onClick={item.ssoTarget ? (event) => void launchSso(event, item.ssoTarget!) : undefined}
          />
          ))}

        {/* Employee Self Service */}
        <div
          className={`${styles.menuItem} ${
            openESS ? styles.activeMenuItem : ""
          }`}
          onClick={() => setOpenESS((prev) => !prev)}
        >
          <MdOutlineMiscellaneousServices className={styles.menuIcon} />
          <span className={styles.menuLabel}>Employee Self Service</span>
          <span className={styles.dropdownArrow}>{openESS ? "▸" : "▾"}</span>

          {openESS && (
            <div className={styles.dropdownMenu}>
              {essItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.subMenuItem} ${
                    pathname === item.path
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Workforce Structure Management */}
        {isApprover && (
          <div
            className={`${styles.menuItem} ${
              openWSM ? styles.activeMenuItem : ""
            }`}
            onClick={() => setOpenWSM((prev) => !prev)}
          >
            <HiOfficeBuilding className={styles.menuIcon} />
            <span className={styles.menuLabel}>Workforce Structure Management</span>
            <span className={styles.dropdownArrow}>{openWSM ? "▸" : "▾"}</span>

            {openWSM && (
              <div className={styles.dropdownMenu}>
                {isInWorkflow && (
                  <Link
                    href="/employee-portal/workforce-structure/approval-request"
                    className={`${styles.subMenuItem} ${
                      pathname === "/employee-portal/workforce-structure/approval-request"
                        ? styles.activeSubMenuItem
                        : ""
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Approval Request
                  </Link>
                )}
                <Link
                  href="/employee-portal/workforce-structure/designated-personnel"
                  className={`${styles.subMenuItem} ${
                    pathname === "/employee-portal/workforce-structure/designated-personnel"
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  Your Business Unit&apos;s Designated Personnel
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
