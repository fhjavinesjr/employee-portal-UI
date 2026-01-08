"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";

import styles from "@/styles/changePassword.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { useRouter } from "next/navigation";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { updateEmployeePassword } from "@/lib/services/api";
import { authLogout } from "@/lib/utils/authLogout";

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !employeePassword || !confirmNewPassword) {
      Swal.fire("Oops...", "Please fill in all fields!", "error");
      return;
    }

    if (employeePassword !== confirmNewPassword) {
      Swal.fire("Oops...", "New passwords do not match!", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to change your password?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, change it!",
    });

    if (!result.isConfirmed) return;

    const employeeId = localStorageUtil.getEmployeeId();

    if (!employeeId) {
      Swal.fire("Error", "Employee not found. Please log in again.", "error");
      return;
    }

    try {
      setSubmitting(true);

      await updateEmployeePassword(
        employeeId,
        currentPassword,
        employeePassword
      );

      Swal.fire("Changed!", "Your password has been changed.", "success");

      // Logout and redirect to login
      authLogout();
      router.push("/employee-portal/login");

      setCurrentPassword("");
      setEmployeePassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      Swal.fire(
        "Failed",
        error.message || "Unable to change password",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="ChangePassword" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>

        {/* Header */}
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Change Password</h2>
        </div>

        {/* Body */}
        <div className={modalStyles.modalBody}>

          <div className={styles.field}>
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label>New Password</label>
            <input
              type="password"
              value={employeePassword}
              onChange={(e) => setEmployeePassword(e.target.value)}
              placeholder="Enter new password"
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={submitting}
            />
          </div>

          <button
            className={styles.button}
            onClick={handleChangePassword}
            disabled={submitting}
          >
            {submitting ? "Changing..." : "Change Password"}
          </button>

        </div>
      </div>
    </div>
  );
}