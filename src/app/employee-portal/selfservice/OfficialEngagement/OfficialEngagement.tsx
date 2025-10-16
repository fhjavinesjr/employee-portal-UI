"use client";

import React, { useState } from "react";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import OfficialEngagementTable from "@/components/tables/officialengagementTable";

export default function OfficialEngagement() {
  const initialFormState = {
    officialType: "",
    from: "",
    to: "",
    details: "",
  };

  const sampleData = [
    {
      dateFiled: "2025-10-10",
      dateCoverage: "2025-10-15 - 2025-10-16",
      recommendingOfficer: "Perez, Ramona Rebelina T.",
      approvedBy: "Magaso, Violeta C.",
      status: "Approved",
      approvalDate: "2025-10-17",
    },
  ];

  const [form, setForm] = useState(initialFormState);

  // ✅ NEW STATE: controls visibility of the table
  const [showTable, setShowTable] = useState(false);

  const officialTypes = ["Official Business", "Official Time"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);

    // ✅ Show the table after clicking Submit
    setShowTable(true);

    // Optionally close modal after submit (remove if not needed)
    // if (onClose) onClose();
  };

  // 🧹 Clear form fields
  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setForm(initialFormState);
    setShowTable(false); // ✅ hide table again when cleared
  };

  return (
    <div id="officialEngagementModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Official Engagement</h2>
        </div>

        <form className={modalStyles.modalBody} onSubmit={handleSubmit}>
          {/* Official Type */}
          <div className={styles.formGroup}>
            <label>Official Type</label>
            <select
              className={styles.selectBase}
              name="officialType"
              value={form.officialType}
              onChange={handleChange}
              required
            >
              <option value="">Select</option>
              {officialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Inclusive Date & Time */}
          <div className={styles.formGroup}>
            <label>Inclusive Date & Time</label>
            <div className={styles.dateRange}>
              <div className={styles.dateItem}>
                <label>From:</label>
                <input
                  type="datetime-local"
                  name="from"
                  value={form.from}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.dateItem}>
                <label>To:</label>
                <input
                  type="datetime-local"
                  name="to"
                  value={form.to}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className={styles.formGroup}>
            <label>Details</label>
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

        {/* ✅ Conditionally render the table */}
        {showTable && <OfficialEngagementTable data={sampleData} />}
      </div>
    </div>
  );
}
