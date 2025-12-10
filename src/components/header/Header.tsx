"use client";
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

export default function Header() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const [showChangePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load theme from localStorage
  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      localStorage.getItem("theme")) as "light" | "dark" | null;
    const currentTheme = saved || "light";
    setTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
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
        <h1 className={styles.title}>Logo with Name?</h1>
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
          <Image
            src="/images/avatar.png"
            alt="User Avatar"
            width={34}
            height={34}
            className={styles.avatar}
            onClick={() => setOpen((p) => !p)}
          />

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
                  setOpen(false);

                  //  Clear localStorage
                  localStorage.clear();

                  //  Delete token cookie
                  document.cookie = "token=; path=/; max-age=0";

                  //  Redirect to login
                  router.push("/employee-portal/login");
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
