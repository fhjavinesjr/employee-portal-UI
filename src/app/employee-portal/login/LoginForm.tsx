"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useEffect } from "react";
import styles from "@/styles/LoginForm.module.scss";
import InputFieldSetup from "../../../components/login/InputFieldSetup";
import ButtonSetup from "../../../components/login/SetupButton";
import Image from "next/image";
import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { Employee } from "@/lib/types/Employee";
import { AUTH_CONFIG } from "@/lib/utils/authConfig";
import { setCookie } from "@/lib/utils/cookies";

const { INACTIVITY_LIMIT } = AUTH_CONFIG;

const API_BASE_URL = runtimeConfig.getApiUrl("hrm");
const API_BASE_URL_ADMINISTRATIVE = runtimeConfig.getApiUrl("administrative");

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const employeeNo = formData.get("employeeNo") as string;
      const employeePassword = formData.get("employeePassword") as string;

      // Login
      const response = await fetch(`${API_BASE_URL}/api/employee/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNo, employeePassword }),
      });

      if (!response.ok) {
        Swal.fire({
          title: "Login failed!",
          text: "Incorrect username or password",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      const token = await response.text();
      localStorageUtil.set(token); // Store authToken

      // after successful login:
      const now = Date.now();
      
      setCookie(AUTH_CONFIG.COOKIE.IS_LOGGED_IN, "true", INACTIVITY_LIMIT);
      setCookie(AUTH_CONFIG.COOKIE.LAST_ACTIVITY, now.toString(),INACTIVITY_LIMIT);

      localStorage.setItem(AUTH_CONFIG.COOKIE.IS_LOGGED_IN, "true");
      localStorage.setItem(AUTH_CONFIG.COOKIE.LAST_ACTIVITY, now.toString());

      // Fetch employees
      const empRes = await fetchWithAuth(
        `${API_BASE_URL}/api/employees/basicInfo`
      );

      if (!empRes.ok) {
        throw new Error("Failed to fetch employee list");
      }

      const employees: Employee[] = await empRes.json();
      const filtered = employees.filter((emp) => emp.employeeNo !== "admin");
      localStorageUtil.setEmployees(filtered); // Store employees list

      // Identify current employee (use unfiltered list so admin can also get their role set)
      const currentEmp = employees.find((emp) => emp.employeeNo === employeeNo);
      if (currentEmp) {
        localStorageUtil.setEmployeeId(currentEmp.employeeId);
        localStorageUtil.setEmployeeNo(currentEmp.employeeNo);
        localStorageUtil.setEmployeeFullname(currentEmp.fullName);
        localStorageUtil.setEmployeeRole(currentEmp.role);
        localStorageUtil.setBiometricNo(currentEmp.biometricNo);
      }

      // Fetch and store system configuration from backend
      try {
        const configRes = await fetchWithAuth(`${API_BASE_URL_ADMINISTRATIVE}/api/system-config/get-all`);
        if (configRes.ok) {
          const configs: Array<{ configKey: string; configValue: string }> = await configRes.json();
          const configMap: Record<string, string> = {};
          configs.forEach(c => { configMap[c.configKey] = c.configValue; });
          localStorageUtil.setSystemConfig(configMap);
        }
      } catch (e) {
        console.warn("Could not load system config:", e);
      }

      // Success alert & redirect
      Swal.fire({
        title: "Login Successfully!",
        text: "Press OK to proceed",
        icon: "success",
        confirmButtonText: "OK",
        allowOutsideClick: false,
        backdrop: true,
      }).then(() => {
        router.push("/employee-portal/dashboard");
      });
    } catch (error) {
      console.error("Login error:", error);
      Swal.fire({
        title: "Login failed!",
        text: "Unreachable backend service",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  useEffect(() => {
    // Force light theme for login page
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("theme"); // Optional: remove dark mode
  }, []);

  return (
    <form onSubmit={handleSubmit} className={styles.Login}>
      <div className={styles.loginImageInput}>
        <div className={styles.loginImage}>
          <Image
            src="/IT_logo.png"
            width={500}
            height={500}
            alt="Employee Portal"
          />
        </div>
        <div className={styles.borderLeft}></div>
        <div className={styles.inputs}>
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #e8e8e8" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a3c6e", margin: 0, marginBottom: 4 }}>Bayanihan GovSuite</h1>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Empowering Public Sector Workforce Management</p>
          </div>
          <div className={styles.header}>
            <h2>Employee Portal</h2>
          </div>
          <InputFieldSetup
            name="employeeNo"
            label="Employee No"
            inputType="text"
            id="emailId"
            required="true"
          />
          <InputFieldSetup
            name="employeePassword"
            label="Password"
            inputType="password"
            id="passwordId"
            required="true"
          />
          <ButtonSetup buttonType="submit" label="Sign In" />
          <ButtonSetup buttonType={undefined} label="Forgot Password?" />
          <div className={styles.horizontalLine}></div>
          <Link href={"/employee-portal/registration"}>
            <ButtonSetup buttonType="button" label="Sign Up" />
          </Link>
        </div>
      </div>
    </form>
  );
}
