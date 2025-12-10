"use client";
import React, { useState } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/changePassword.module.scss";
import modalStyles from "@/styles/Modal.module.scss";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Please fill in all fields!",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "New passwords do not match!",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to change your password?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, change it!",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire("Changed!", "Your password has been changed.", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    });
  };

  return (
    <div id="ChangePassword" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>

        {/* Header */}
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Change Password</h2>
        </div>

        {/* Modal Body  */}
        <div className={modalStyles.modalBody}>

          <div className={styles.field}>
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>

          <div className={styles.field}>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button className={styles.button} onClick={handleChangePassword}>
            Change Password
          </button>

        </div>
      </div>
    </div>
  );
}
