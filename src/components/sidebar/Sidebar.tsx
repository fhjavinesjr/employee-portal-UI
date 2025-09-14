'use client'

import React from "react";
import { MenuItem } from "./MenuItem";
import styles from "@/styles/DashboardSidebar.module.scss";
import { usePathname } from 'next/navigation';
// import { usePathname, useRouter } from 'next/navigation';

const menuItems = [
  {
    id: 1,
    icon: "/dashboard.png",
    label: "Dashboard",
    goto: "/employee-portal/dashboard",
    isActive: true,
  },
  {
    id: 2,
    icon: "/employee_portal.png",
    label: "Daily Time Record",
    goto: "/employee-portal/dtr",
    isActive: false,
  },
  {
    id: 3,
    icon: "/employee_portal.png",
    label: "Work Schedule",
    goto: "/employee-portal/workschedule",
    isActive: false,
  },
];

const otherItems = [
  {
    id: 4,
    icon: "/accounts.png",
    label: "Accounts",
    goto: "/employee-portal/accounts",
    isActive: false,
  },
  {
    id: 5,
    icon: "/help.png",
    label: "Help",
    goto: "/employee-portal",
    isActive: false,
  },
];

export default function Sidebar() {
  const pathname = usePathname(); // Use usePathname for the current route
  // const router = useRouter();    // Use useRouter for navigation

  return (
    <nav className={styles.Sidebar} role="navigation" aria-label="Main navigation">
      <div className={styles.brand}>
        <div className={styles.brandIcon}>EPUI</div>
        <div className={styles.brandName}>Employee Portal UI</div>
      </div>

      <div className={styles.menuSection}>
        <h2 className={styles.menuHeader}>MENU</h2>
        <div role="menu">
          {menuItems.map((item, index) => (
            <MenuItem key={index} icon={item.icon} label={item.label} goto={item.goto} isActive={pathname === item.goto} onClick={() => {}} />
          ))}
        </div>
      </div>

      <div className={styles.menuSection}>
        <h2 className={styles.menuHeader}>UTILITIES</h2>
        <div role="menu">
          {otherItems.map((item, index) => (
            <MenuItem key={index} icon={item.icon} label={item.label} goto={item.goto} isActive={pathname === item.goto} onClick={() => {}} />
          ))}
        </div>
      </div>
    </nav>
  );
};
