"use client";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useEffect, useRef } from "react";
import {
  FiMail,
  FiMoon,
  FiSun,
  FiUser,
  FiKey,
  FiHelpCircle,
  FiLogOut,
} from "react-icons/fi";
import Notification from "../notification/Notification";
import styles from "@/styles/header.module.scss";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ChangePassword from "@/app/employee-portal/changepassword/ChangePassword";
import { authLogout } from "@/lib/utils/authLogout";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchPersonalData } from "@/lib/services/api";

const API_BASE_URL_ADMINISTRATIVE = runtimeConfig.getApiUrl("administrative");

export default function Header() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const [showChangePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [mainLogoBase64, setMainLogoBase64] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Load theme from localStorage
  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      localStorage.getItem("theme")) as "light" | "dark" | null;
    const currentTheme = saved || "light";
    setTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, []);

  // Fetch employee profile picture
  useEffect(() => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    fetchPersonalData(empId)
      .then((data) => {
        if (data.employeePicture) {
          setProfilePic(`data:image/jpeg;base64,${data.employeePicture}`);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch company settings
  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL_ADMINISTRATIVE}/api/settings/get-all`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { companyName?: string; mainLogo?: string | null }[]) => {
        if (data && data.length > 0) {
          setCompanyName(data[0].companyName || "");
          setMainLogoBase64(data[0].mainLogo || null);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown if click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    if (typeof window !== "undefined") localStorage.setItem("theme", newTheme);
  };

  // If showing ChangePassword, render only that
  if (showChangePassword) {
    return <ChangePassword />;
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {mainLogoBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${mainLogoBase64}`}
            alt="Company Logo"
            className={styles.companyLogo}
          />
        )}
        {companyName && (
          <h1 className={styles.title}>{companyName}</h1>
        )}
        {!companyName && !mainLogoBase64 && (
          <h1 className={styles.title}>Employee Portal</h1>
        )}
        <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", padding: "2px 8px", borderRadius: 4, backgroundColor: "var(--bg-secondary, #f3f4f6)", letterSpacing: "0.3px", whiteSpace: "nowrap", marginLeft: 4 }}>
          ISOFT HRIS
        </span>
      </div>

      <div className={styles.actions}>
        <Notification />
        <FiMail className={styles.icon} />

        <button onClick={toggleTheme} className={styles.themeToggle}>
          {theme === "light" ? (
            <FiMoon className={styles.icon} />
          ) : (
            <FiSun className={styles.icon} />
          )}
        </button>

        <div className={styles.profileWrapper} ref={dropdownRef}>
          {profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilePic}
              alt="User Avatar"
              width={34}
              height={34}
              className={styles.avatar}
              style={{ borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
              onClick={() => setOpen((p) => !p)}
            />
          ) : (
            <Image
              src="/avatar-default.png"
              alt="User Avatar"
              width={34}
              height={34}
              className={styles.avatar}
              onClick={() => setOpen((p) => !p)}
            />
          )}

          {open && (
            <div className={styles.profileDropdown}>
              {/* ----------------- PROFILE BUTTON ----------------- */}
              <button
                className={styles.profileItem}
                onClick={() => {
                  setOpen(false);
                  router.push("/employee-portal/profile");
                }}
              >
                <FiUser className={styles.dropdownIcon} /> Profile
              </button>

              {/* ----------------- CHANGE PASSWORD BUTTON ----------------- */}
              <button
                className={styles.profileItem}
                onClick={() => {
                  setOpen(false);
                  router.push("/employee-portal/changepassword");
                }}
              >
                <FiKey className={styles.dropdownIcon} /> Change Password
              </button>

              {/* ----------------- HELP BUTTON ----------------- */}
              <button className={styles.profileItem}>
                <FiHelpCircle className={styles.dropdownIcon} /> Help
              </button>
              
              {/* ----------------- LOGOUT BUTTON ----------------- */}
              <button
                className={styles.profileItem}
                onClick={() => {
                  setOpen(false); // close dropdown
                  authLogout(); // delete cookies and localStorage
                  router.replace("/employee-portal/login"); // redirect safely
                }}
              >
                <FiLogOut className={styles.dropdownIcon} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
