"use client";

import React, { useState } from "react";
import modalStyles from "@/styles/Modal.module.scss";
import styles from "@/styles/LeaveApplication.module.scss";
import Tstyle from "@/styles/TimeCorrection.module.scss";
import to12HourFormat from "@/lib/utils/convert24To12HrFormat";

interface TimeCorrectionProps {
  onClose?: () => void; // optional close handler
}

type TimeField = { hour: string; minute: string };

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function TimeCorrection({ onClose }: TimeCorrectionProps) {
  const [form, setForm] = useState({
    date: "",
    timeIn: { hour: "08", minute: "00" } as TimeField,
    breakOut: { hour: "", minute: "" } as TimeField,
    breakIn: { hour: "", minute: "" } as TimeField,
    timeOut: { hour: "17", minute: "00" } as TimeField,
    details: "",
  });

  const setTimeField = (field: "timeIn" | "breakOut" | "breakIn" | "timeOut", part: "hour" | "minute", value: string) => {
    setForm({ ...form, [field]: { ...form[field], [part]: value } });
  };

  const to12 = (t: TimeField) =>
    t.hour && t.minute ? to12HourFormat(`${t.hour}:${t.minute}`) : "";

  const renderTimeSelect = (
    field: "timeIn" | "breakOut" | "breakIn" | "timeOut"
  ) => {
    const val = form[field] as TimeField;
    return (
      <div>
        <div className={Tstyle.timeGroup}>
          <select
            className={Tstyle.timeSelect}
            value={val.hour}
            onChange={(e) => setTimeField(field, "hour", e.target.value)}
          >
            <option value="">--</option>
            {hours.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span className={Tstyle.timeColon}>:</span>
          <select
            className={Tstyle.timeSelect}
            value={val.minute}
            onChange={(e) => setTimeField(field, "minute", e.target.value)}
          >
            <option value="">--</option>
            {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {val.hour && val.minute && (
          <span className={Tstyle.time12Label}>{to12(val)}</span>
        )}
      </div>
    );
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
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div className={Tstyle.formRow}>
            <label>Time In</label>
            {renderTimeSelect("timeIn")}
          </div>

          <div className={Tstyle.formRow}>
            <label>Break Out <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "#6b7280" }}>(optional)</span></label>
            {renderTimeSelect("breakOut")}
          </div>

          <div className={Tstyle.formRow}>
            <label>Break In <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "#6b7280" }}>(optional)</span></label>
            {renderTimeSelect("breakIn")}
          </div>

          <div className={Tstyle.formRow}>
            <label>Time Out</label>
            {renderTimeSelect("timeOut")}
          </div>

           {/* Details */}
          <div className={styles.formGroup}>
            <label className={styles.labelDetails}>Details</label>
            <textarea
              name="details"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
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
