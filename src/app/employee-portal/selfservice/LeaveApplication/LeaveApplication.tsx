"use client";

import React, { useState } from "react";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import LeaveApplicationTable from "@/components/tables/leaveapplicationTable";

interface LeaveData {
  dateFiled: string;
  from: string;
  to: string;
  leaveType: string;
  commutation: string;
  details: string;
  status: string;
}

export default function LeaveApplication() {
  const initialFormState = {
    dateFiled: "",
    leaveType: "",
    from: "",
    to: "",
    commutation: "requested",
    details: "",
    noOfDays: "", // ✅ added but NOT part of LeaveData (safe)
  };

  const [form, setForm] = useState(initialFormState);
  const [submittedLeaves, setSubmittedLeaves] = useState<LeaveData[]>([]);

  const leaveTypes = [
    "Vacation Leave",
    "Sick Leave",
    "Forced Leave",
    "Special Privilege Leave",
    "Study Leave",
    "Terminal Leave",
    "Paternity Leave",
    "Maternity Leave",
    "Solo Parent Leave",
    "Adoption Leave",
    "Rehabilitation Leave",
    "Gynecological Leave",
    "COVID-19 Treatment Leave",
    "10-Day VAWC Leave",
    "Special Emergency Leave",
    "Leave Monetization", // ✅ ADDED
  ];

  const isMonetization = form.leaveType === "Leave Monetization";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Keep LeaveData shape intact (no TS errors)
    const newLeave: LeaveData = {
      dateFiled: form.dateFiled,
      leaveType: form.leaveType,
      from: isMonetization ? "" : form.from,
      to: isMonetization ? "" : form.to,
      commutation: isMonetization ? "" : form.commutation,
      details: form.details,
      status: "Approved",
    };

    setSubmittedLeaves((prev) => [...prev, newLeave]);
    setForm(initialFormState);
  };
  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setForm(initialFormState);
    setSubmittedLeaves([]);
  };

  return (
    <div id="leaveapplicationModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Leave Application</h2>
        </div>

        <form className={modalStyles.modalBody} onSubmit={handleSubmit}>
          {/* Date Filed */}
          <div className={styles.formGroup}>
            <label className={styles.labelDateFiled}>Date Filed</label>
            <input
              className={`${styles.inputBase} ${styles.dateFiledInput}`}
              type="date"
              name="dateFiled"
              value={form.dateFiled}
              onChange={handleChange}
              required
            />
          </div>

          {/* Leave Type */}
          <div className={styles.formGroup}>
            <label className={styles.labelLeaveType}>Leave Type</label>
            <select
              className={styles.selectBase}
              name="leaveType"
              value={form.leaveType}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select
              </option>
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Inclusive Dates (HIDDEN for Monetization) */}
          {!isMonetization && (
            <div className={styles.formGroup}>
              <label className={styles.labelInclusiveDate}>
                Inclusive Date
              </label>
              <label>From:</label>
              <div className={styles.dateRange}>
                <input
                  className={styles.inputBase}
                  type="date"
                  name="from"
                  value={form.from}
                  onChange={handleChange}
                  required
                />
                <label>To:</label>
                <input
                  className={styles.inputBase}
                  type="date"
                  name="to"
                  value={form.to}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {/* Commutation (HIDDEN for Monetization) */}
          {!isMonetization && (
            <div className={styles.formGroup}>
              <label className={styles.labelCommutation}>Commutation</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    name="commutation"
                    value="requested"
                    checked={form.commutation === "requested"}
                    onChange={handleChange}
                    required
                  />
                  Requested
                </label>
                <label>
                  <input
                    type="radio"
                    name="commutation"
                    value="notRequested"
                    checked={form.commutation === "notRequested"}
                    onChange={handleChange}
                    required
                  />
                  Not Requested
                </label>
              </div>
            </div>
          )}

          {/* Leave Monetization ONLY */}
          {isMonetization && (
            <>
              <div className={styles.formGroup}>
                <label>Leave Credits</label>
                <div style={{ display: "flex", gap: "2rem" }}>
                  <span>
                    <strong>SL</strong> 19.417
                  </span>
                  <span>
                    <strong>VL</strong> 48.13
                  </span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>No. of Day(s)</label>
                <input
                  className={styles.inputBase}
                  type="number"
                  name="noOfDays"
                  placeholder="Enter Number"
                  value={form.noOfDays}
                  onChange={handleChange}
                  min={1}
                  required
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Details */}
          <div className={styles.formGroup}>
            <label className={styles.labelDetails}>Details</label>
            <textarea
              name="details"
              value={form.details}
              onChange={handleChange}
              placeholder="Enter details..."
              required
            />
          </div>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitBtn}>
              Submit
            </button>
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearBtn}
            >
              Clear
            </button>
          </div>
        </form>

        {submittedLeaves.length > 0 && (
          <LeaveApplicationTable data={submittedLeaves} />
        )}
      </div>
    </div>
  );
}
