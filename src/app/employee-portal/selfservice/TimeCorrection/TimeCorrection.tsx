"use client";

import React, { useState } from "react";
import modalStyles from "@/styles/Modal.module.scss";
import styles from "@/styles/LeaveApplication.module.scss";
import Tstyle from "@/styles/TimeCorrection.module.scss";

interface TimeCorrectionProps {
  onClose?: () => void; // optional close handler
}

export default function TimeCorrection({ onClose }: TimeCorrectionProps) {
  const [form, setForm] = useState({
    date: "",
    timeIn: "",
    breakOut: "",
    breakIn: "",
    timeOut: "",
    details: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Data:", form);
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  return (
    <div id="timecorrectionModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
        <h2 className={modalStyles.mainTitle}>Time Correction</h2>
        </div>

        <form onSubmit={handleSave} className={modalStyles.modalBody}>
          <div className={Tstyle.formRow}>
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className={Tstyle.formRow}>
            <label htmlFor="timeIn">Time In</label>
            <input
              type="time"
              id="timeIn"
              name="timeIn"
              value={form.timeIn}
              onChange={handleChange}
            />
          </div>

          <div className={Tstyle.formRow}>
            <label htmlFor="breakOut">Break Out</label>
            <input
              type="time"
              id="breakOut"
              name="breakOut"
              value={form.breakOut}
              onChange={handleChange}
            />
          </div>

          <div className={Tstyle.formRow}>
            <label htmlFor="breakIn">Break In</label>
            <input
              type="time"
              id="breakIn"
              name="breakIn"
              value={form.breakIn}
              onChange={handleChange}
            />
          </div>

          <div className={Tstyle.formRow}>
            <label htmlFor="timeOut">Time Out</label>
            <input
              type="time"
              id="timeOut"
              name="timeOut"
              value={form.timeOut}
              onChange={handleChange}
            />
          </div>

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

          <div className={Tstyle.buttonContainer}>
            <button type="submit" className={Tstyle.saveBtn}>
              Save
            </button>
            <button
              type="button"
              className={Tstyle.cancelButton}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
