"use client";

import React, { useState } from "react";
import styles from "@/styles/compensatoryTimeOff.module.scss";
import modalStyles from "@/styles/Modal.module.scss";

export default function CompensatoryTimeOff() {
  const initialFormState = {
    date: "",
    hours: "",
    reason: "",
  };

  const [form, setForm] = useState(initialFormState);

  const currentBalance = 65.5; // sample value (readonly)

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

    console.log("CTO Submitted:", form);

    setForm(initialFormState);
  };

  const handleCancel = () => {
    setForm(initialFormState);
  };

  return (
    <div className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Compensatory Time Off</h2>
        </div>

        <form className={modalStyles.modalBody} onSubmit={handleSubmit}>
          {/* Current Balance */}
          <div className={styles.formGroup}>
            <label>Current Balance</label>
            <span>{currentBalance}</span>
          </div>

          {/* Date */}
          <div className={styles.formGroup}>
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Hours */}
          <div className={styles.formGroup}>
            <label>Hours</label>
            <select
              name="hours"
              value={form.hours}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select 
              </option>
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="24">24</option>
            </select>
          </div>

          {/* Reason */}
          <div className={styles.formGroup}>
            <label>Details</label>
            <textarea
              name="reason"
              placeholder="Enter Details..."
              value={form.reason}
              onChange={handleChange}
              rows={5}
            />
          </div>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitBtn}>
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.clearBtn}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
