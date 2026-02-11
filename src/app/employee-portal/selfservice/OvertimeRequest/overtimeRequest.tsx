"use client";

import React, { useState, useMemo } from "react";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";

export default function OvertimeRequest() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const nowLocal = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  };
  const duration = useMemo(() => {
    if (!from || !to) return null;

    const start = new Date(from);
    const end = new Date(to);

    if (end <= start) return null;

    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { hours, minutes };
  }, [from, to]);

  return (
    <div id="overtimeRequest" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Overtime Request</h2>
        </div>

        <form className={modalStyles.modalBody}>
          {/* Inclusive Date & Time */}
          <div className={styles.formGroup}>
            <label>Inclusive Date & Time</label>

            <div className={styles.dateRange}>
              <div className={styles.dateItem}>
                <label>From:</label>
                <input
                  type="datetime-local"
                  value={from}
                  min={nowLocal()}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              <div className={styles.dateItem}>
                <label>To:</label>
                <input
                  type="datetime-local"
                  value={to}
                  min={from || nowLocal()}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Auto-calculated duration */}
          {duration && (
            <div className={styles.formGroup}>
              <label>Total Overtime</label>
              <div className={styles.readonlyBox}>
                {duration.hours} hour(s) {duration.minutes} minute(s)
              </div>
            </div>
          )}

          {/* Details */}
          <div className={styles.formGroup}>
            <label>Details</label>
            <textarea placeholder="Enter details..." />
          </div>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitBtn}>
              Submit
            </button>
            <button type="reset" className={styles.clearBtn}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
