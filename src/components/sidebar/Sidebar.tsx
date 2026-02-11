"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MenuItem } from "./MenuItem";
import styles from "@/styles/DashboardSidebar.module.scss";
import { usePathname } from "next/navigation";

import { FaHome, FaUserFriends } from "react-icons/fa";
import { MdAccessTime, MdOutlineMiscellaneousServices } from "react-icons/md";
import { HiViewGrid } from "react-icons/hi";


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
    goto: "/employee-portal/admin",
  },
  {
    id: 3,
    icon: <FaUserFriends />,
    label: "HR Management",
    goto: "/employee-portal/hr",
  },
  {
    id: 4,
    icon: <MdAccessTime />,
    label: "Timekeeping",
    goto: "/employee-portal/timekeeping",
  },
];

const essItems = [
  {
    label: "Leave Application",
    path: "/employee-portal/selfservice/LeaveApplication",
  },
  {
    label: "Compensatory Time Off",
    path: "/employee-portal/selfservice/CompensatoryTimeOff",
  },
  {
    label: "Overtime Request",
    path: "/employee-portal/selfservice/OvertimeRequest",
  },
  {
    label: "Time Correction",
    path: "/employee-portal/selfservice/TimeCorrection",
  },
  {
    label: "Official Engagement",
    path: "/employee-portal/selfservice/OfficialEngagement",
  },
  {
    label: "Pass Slip",
    path: "/employee-portal/selfservice/PassSlip",
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  const isESSRoute = pathname?.startsWith("/employee-portal/selfservice");
  const [openESS, setOpenESS] = useState(isESSRoute);

  // Keep ESS open if pathname is inside self-service
useEffect(() => {
  setOpenESS(isESSRoute);
}, [isESSRoute]);

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
      </div>
    </nav>
  );
}