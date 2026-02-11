"use client";

import React, { useState } from "react";
import styles from "@/styles/PassSlip.module.scss";
import modalStyles from "@/styles/Modal.module.scss";

export default function PassSlip() {
  const initialFormState = {
    passSlipDate: "",
    purpose: "",
    departureOut: "",
    arrivalIn: "",
    details: "",
  };

  const [form, setForm] = useState(initialFormState);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-set time based on purpose
  const handlePurposeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === "Official") {
      setForm((prev) => ({
        ...prev,
        purpose: value,
        departureOut: "08:00",
        arrivalIn: "17:00",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        purpose: value,
        departureOut: "",
        arrivalIn: "",
      }));
    }
  };

  const handleClear = () => {
    setForm(initialFormState);
  };

  return (
    <div id="passSlipModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Pass Slip</h2>
        </div>

        <form className={modalStyles.modalBody}>
          {/* Pass Slip Date */}
          <div className={styles.formGroup}>
            <label>Pass Slip Date</label>
            <input
              type="date"
              name="passSlipDate"
              value={form.passSlipDate}
              onChange={handleChange}
              required
            />
          </div>

          {/* Purpose */}
          <div className={styles.formGroup}>
            <label>Purpose</label>
            <select
              name="purpose"
              value={form.purpose}
              onChange={handlePurposeChange}
              required
            >
              <option value="" disabled>Select </option>
              <option value="Personal">Personal</option>
              <option value="Official">Official</option>
            </select>
          </div>

          {/* Time */}
          <div className={styles.formGroup}>
            <label>Time</label>
            <div className={styles.dateRange}>
              <div className={styles.dateItem}>
                <label>Departure Out</label>
                <input
                  type="time"
                  name="departureOut"
                  value={form.departureOut}
                  onChange={handleChange}
                  disabled={form.purpose === "Official"}
                  required
                />
              </div>

              <div className={styles.dateItem}>
                <label>Arrival In</label>
                <input
                  type="time"
                  name="arrivalIn"
                  value={form.arrivalIn}
                  onChange={handleChange}
                  disabled={form.purpose === "Official"}
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
              className={styles.clearBtn}
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
