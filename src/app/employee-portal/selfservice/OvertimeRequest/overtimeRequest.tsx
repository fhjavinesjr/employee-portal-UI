"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

interface OvertimeRequestDTO {
  overtimeRequestId?: number;
  employeeId: number;
  dateFiled: string;
  dateTimeFrom: string;
  dateTimeTo: string;
  totalHours?: number;
  purpose: string;
  status: string;
  approvedById?: number | null;
  approvedAt?: string | null;
  approvalRemarks?: string | null;
}

interface FormState {
  dateFiled: string;
  dateTimeFrom: string;
  dateTimeTo: string;
  purpose: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function OvertimeRequest() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<OvertimeRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const nowLocal = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState<FormState>({
    dateFiled: today,
    dateTimeFrom: nowLocal(),
    dateTimeTo: nowLocal(),
    purpose: "",
  });

  const duration = useMemo(() => {
    if (!form.dateTimeFrom || !form.dateTimeTo) return null;
    const start = new Date(form.dateTimeFrom);
    const end = new Date(form.dateTimeTo);
    if (end <= start) return null;
    const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
  }, [form.dateTimeFrom, form.dateTimeTo]);

  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/overtime-request/get-all/${empId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: OvertimeRequestDTO[] = await res.json();
      setRecords(data);
    } catch {
      Toast.fire({ icon: "error", title: "Could not load overtime records" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) {
      Swal.fire({ icon: "warning", title: "Session expired. Please log in again." });
      return;
    }
    if (!duration) {
      Swal.fire({ icon: "warning", title: "End time must be after start time" });
      return;
    }
    if (!form.purpose.trim()) {
      Swal.fire({ icon: "warning", title: "Purpose / justification is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: OvertimeRequestDTO = {
        employeeId: Number(empId),
        dateFiled: form.dateFiled,
        dateTimeFrom: form.dateTimeFrom.replace("T", " ") + ":00",
        dateTimeTo: form.dateTimeTo.replace("T", " ") + ":00",
        purpose: form.purpose,
        status: "Pending",
      };
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/overtime-request/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "Overtime request filed successfully" });
      setForm({ dateFiled: today, dateTimeFrom: nowLocal(), dateTimeTo: nowLocal(), purpose: "" });
      setActiveTab("table");
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file overtime request", text: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const color =
      status === "Approved" ? "#16a34a" :
      status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const fmtDateTime = (dt: string | null | undefined) => {
    if (!dt) return "—";
    return dt.replace("T", " ").substring(0, 16);
  };

  return (
    <div id="overtimeRequest" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Overtime Request</h2>
        </div>

        <div className={modalStyles.modalBody}>
          {/* Tabs */}
          <div className={styles.tabContainer} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === "table" ? 700 : 400, color: activeTab === "table" ? "#1d4ed8" : "#374151", borderBottom: activeTab === "table" ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}
            >
              My Requests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("apply")}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === "apply" ? 700 : 400, color: activeTab === "apply" ? "#1d4ed8" : "#374151", borderBottom: activeTab === "apply" ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}
            >
              File Request
            </button>
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No overtime request records found.</p>}
              {!isLoading && records.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={th}>Date Filed</th>
                        <th style={th}>From</th>
                        <th style={th}>To</th>
                        <th style={th}>Total Hours</th>
                        <th style={th}>Purpose</th>
                        <th style={th}>Status</th>
                        <th style={th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.overtimeRequestId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={td}>{r.dateFiled}</td>
                          <td style={td}>{fmtDateTime(r.dateTimeFrom)}</td>
                          <td style={td}>{fmtDateTime(r.dateTimeTo)}</td>
                          <td style={td}>{r.totalHours?.toFixed(2)} hrs</td>
                          <td style={td}>{r.purpose}</td>
                          <td style={td}>{statusBadge(r.status)}</td>
                          <td style={td}>{r.approvalRemarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "apply" && (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", maxWidth: 520 }}>
              <div className={styles.formGroup}>
                <label>Date Filed</label>
                <input type="date" value={form.dateFiled} onChange={(e) => setForm({ ...form, dateFiled: e.target.value })} className={styles.inputField} required />
              </div>
              <div className={styles.formGroup}>
                <label>Inclusive Date &amp; Time — From</label>
                <input type="datetime-local" value={form.dateTimeFrom} onChange={(e) => setForm({ ...form, dateTimeFrom: e.target.value })} className={styles.inputField} required />
              </div>
              <div className={styles.formGroup}>
                <label>Inclusive Date &amp; Time — To</label>
                <input type="datetime-local" value={form.dateTimeTo} min={form.dateTimeFrom} onChange={(e) => setForm({ ...form, dateTimeTo: e.target.value })} className={styles.inputField} required />
              </div>
              {duration && (
                <div className={styles.formGroup}>
                  <label>Total Overtime (auto-computed)</label>
                  <div style={{ padding: "0.4rem 0.6rem", background: "#f1f5f9", borderRadius: 4, fontSize: "0.9rem" }}>
                    {duration.hours} hr(s) {duration.minutes} min(s)
                  </div>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Purpose / Justification</label>
                <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={styles.inputField} rows={3} required />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting..." : "File Overtime Request"}
                </button>
                <button type="button" onClick={() => setForm({ dateFiled: today, dateTimeFrom: nowLocal(), dateTimeTo: nowLocal(), purpose: "" })} className={styles.clearBtn}>
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "6px 12px", verticalAlign: "middle" };
