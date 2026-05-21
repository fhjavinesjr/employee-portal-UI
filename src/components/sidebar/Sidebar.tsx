"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MenuItem } from "./MenuItem";
import styles from "@/styles/DashboardSidebar.module.scss";
import { usePathname } from "next/navigation";

import { FaHome, FaUserFriends } from "react-icons/fa";
import { MdAccessTime, MdOutlineMiscellaneousServices } from "react-icons/md";
import { HiViewGrid, HiOfficeBuilding } from "react-icons/hi";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";


const UI_URL_ADMINISTRATIVE = runtimeConfig.getUiUrl("administrative");
const UI_URL_HRM = runtimeConfig.getUiUrl("hrm");
const UI_URL_TIMEKEEPING = runtimeConfig.getUiUrl("timekeeping");
const UI_URL_PAYROLL = runtimeConfig.getUiUrl("payroll");

const menuItems = [
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
    goto: `${UI_URL_ADMINISTRATIVE}/administrative/welcomepage`,
  },
  {
    id: 3,
    icon: <FaUserFriends />,
    label: "HR Management",
    goto: `${UI_URL_HRM}/hr-management/welcomepage`,
  },
  {
    id: 4,
    icon: <MdAccessTime />,
    label: "Timekeeping",
    goto: `${UI_URL_TIMEKEEPING}/time-keeping/welcomepage`,
  },
  {
    id: 5,
    icon: <MdOutlineMiscellaneousServices />,
    label: "Payroll",
    goto: `${UI_URL_PAYROLL}/payroll-management/welcomepage`,
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
        {menuItems.map((item) => (
          <MenuItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            goto={item.goto}
            isActive={pathname === item.goto}
            onClick={() => {}}
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