"use client";

import React, { useState } from "react";
import { MenuItem } from "./MenuItem";
import styles from "@/styles/DashboardSidebar.module.scss";
import { usePathname } from "next/navigation";

import { FaHome, FaUserFriends } from "react-icons/fa";
import { MdAccessTime, MdOutlineMiscellaneousServices } from "react-icons/md";
import { HiViewGrid } from "react-icons/hi";

// Import the LeaveApplication modal form
import LeaveApplication from "@/app/employee-portal/selfservice/LeaveApplication/LeaveApplication"; // adjust if needed

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

export default function Sidebar() {
  const pathname = usePathname();
  const [openESS, setOpenESS] = useState(false);

  return (
    <>
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

          {/* Employee Self Service Dropdown */}
          <div
            className={`${styles.menuItem} ${
              openESS ? styles.activeMenuItem : ""
            }`}
            onClick={() => setOpenESS(!openESS)}
          >
            <MdOutlineMiscellaneousServices className={styles.menuIcon} />
            <span className={styles.menuLabel}>Employee Self Service</span>
            <span className={styles.dropdownArrow}>{openESS ? "▸" : "▾"}</span>

            {openESS && (
              <div className={styles.dropdownMenu}>
                {/* Leave Application -> modal trigger */}
                <a
                  href="/employee-portal/selfservice/LeaveApplication"
                  className={`${styles.subMenuItem} ${
                    pathname === "/employee-portal/selfservice/LeaveApplication"
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  Leave Application
                </a>

                <a
                  href="/employee-portal/selfservice/payoff"
                  className={`${styles.subMenuItem} ${
                    pathname === "/employee-portal/selfservice/payoff"
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                >
                  Compensatory Time Off
                </a>
                <a
                  href="/employee-portal/selfservice/overtime"
                  className={`${styles.subMenuItem} ${
                    pathname === "/employee-portal/selfservice/overtime"
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                >
                  Overtime Request
                </a>
                <a
                  href="/employee-portal/selfservice/TimeCorrection"
                  className={`${styles.subMenuItem} ${
                    pathname === "/employee-portal/selfservice/TimeCorrection"
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                >
                  Time Correction
                </a>

                <a
                  href="/employee-portal/selfservice/OfficialEngagement"
                  className={`${styles.subMenuItem} ${
                    pathname === "/employee-portal/selfservice/OfficialEngagement"
                      ? styles.activeSubMenuItem
                      : ""
                  }`}
                >
                  Official Engagement
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
