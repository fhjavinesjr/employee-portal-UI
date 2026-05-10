"use client";

import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

interface OfficialEngagementDTO {
  officialEngagementApplicationId?: number;
  employeeId: number;
  dateFiled: string;
  officialType: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  details: string;
  status: string;
  recommendedById?: number | null;
  approvedById?: number | null;
  approvalRemarks?: string | null;
}

interface FormState {
  dateFiled: string;
  officialType: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  details: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function OfficialEngagement() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<OfficialEngagementDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<FormState>({
    dateFiled: today, officialType: "Official Business",
    startDate: today, startTime: "08:00",
    endDate: today, endTime: "17:00", details: "",
  });

  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/official-engagement/get-all/${empId}`);
      if (!res.ok) throw new Error();
      setRecords(await res.json());
    } catch { Toast.fire({ icon: "error", title: "Could not load official engagement records" }); }
    finally { setIsLoading(false); }
  }, []);

  const fetchEmployeeNames = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/employees/basicInfo`);
      if (!res.ok) return;
      const data: { employeeId: number; fullName?: string; firstname?: string; lastname?: string }[] = await res.json();
      const map = new Map<number, string>();
      data.forEach((e) => {
        const name = e.fullName?.trim() || [e.firstname, e.lastname].filter(Boolean).join(" ").trim();
        if (e.employeeId && name) map.set(e.employeeId, name);
      });
      setNameMap(map);
    } catch {}
  }, []);

  useEffect(() => { fetchRecords(); fetchEmployeeNames(); }, [fetchRecords, fetchEmployeeNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) { Swal.fire({ icon: "warning", title: "Session expired. Please log in again." }); return; }
    if (form.endDate < form.startDate || (form.endDate === form.startDate && form.endTime <= form.startTime)) {
      Swal.fire({ icon: "warning", title: "End date/time must be after start date/time" }); return;
    }
    // Client-side datetime overlap check against existing records
    const newStart = new Date(`${form.startDate}T${form.startTime}`);
    const newEnd = new Date(`${form.endDate}T${form.endTime}`);
    const conflict = records.find((r) => {
      if (editingId !== null && r.officialEngagementApplicationId === editingId) return false;
      if (r.status !== "Pending" && r.status !== "Approved") return false;
      if (!r.startDate || !r.startTime || !r.endDate || !r.endTime) return false;
      const exStart = new Date(`${r.startDate}T${r.startTime.substring(0, 5)}`);
      const exEnd = new Date(`${r.endDate}T${r.endTime.substring(0, 5)}`);
      return newStart < exEnd && newEnd > exStart;
    });
    if (conflict) {
      Swal.fire({
        icon: "error",
        title: "Time Conflict",
        text: `An Official Engagement (${conflict.officialType}) already exists from ${conflict.startDate} ${conflict.startTime?.substring(0, 5)} to ${conflict.endDate} ${conflict.endTime?.substring(0, 5)}. Please choose a different date/time range.`,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: OfficialEngagementDTO = {
        employeeId: Number(empId), dateFiled: form.dateFiled,
        officialType: form.officialType,
        startDate: form.startDate, startTime: form.startTime + ":00",
        endDate: form.endDate, endTime: form.endTime + ":00",
        details: form.details, status: "Pending",
      };
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/official-engagement/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/official-engagement/create`;
      const res = await fetchWithAuth(url, {
        method: editingId !== null ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "Official engagement updated" : "Official engagement filed successfully" });
      setForm({ dateFiled: today, officialType: "Official Business", startDate: today, startTime: "08:00", endDate: today, endTime: "17:00", details: "" });
      setEditingId(null);
      setActiveTab("table");
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file official engagement", text: err instanceof Error ? err.message : String(err) });
    } finally { setIsSubmitting(false); }
  };

  const statusBadge = (status: string) => {
    const color = status === "Approved" ? "#16a34a" : status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const handleEdit = (r: OfficialEngagementDTO) => {
    setEditingId(r.officialEngagementApplicationId!);
    setForm({
      dateFiled: r.dateFiled,
      officialType: r.officialType,
      startDate: r.startDate,
      startTime: r.startTime?.substring(0, 5) ?? "08:00",
      endDate: r.endDate,
      endTime: r.endTime?.substring(0, 5) ?? "17:00",
      details: r.details,
    });
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this official engagement?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/official-engagement/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "Official engagement deleted" });
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
    }
  };

  return (
    <div id="officialEngagementModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Official Engagement</h2>
        </div>
        <div className={modalStyles.modalBody}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            {(["table", "apply"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#1d4ed8" : "#374151", borderBottom: activeTab === tab ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}>
                {tab === "table" ? "My Applications" : (editingId !== null ? "Edit Application" : "File Application")}
              </button>
            ))}
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No official engagement records found.</p>}
              {!isLoading && records.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={th}>Date Filed</th>
                        <th style={th}>Type</th>
                        <th style={th}>Start</th>
                        <th style={th}>End</th>
                        <th style={th}>Details</th>
                        <th style={th}>Status</th>
                        <th style={th}>Remarks</th>
                        <th style={th}>Recommending Officer</th>
                        <th style={th}>Approved By</th>
                        <th style={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.officialEngagementApplicationId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={td}>{r.dateFiled}</td>
                          <td style={td}>{r.officialType}</td>
                          <td style={td}>{r.startDate} {r.startTime?.substring(0, 5)}</td>
                          <td style={td}>{r.endDate} {r.endTime?.substring(0, 5)}</td>
                          <td style={td}>{r.details}</td>
                          <td style={td}>{statusBadge(r.status)}</td>
                          <td style={td}>{r.approvalRemarks ?? "—"}</td>
                          <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                          <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                          <td style={td}>
                            {r.status === "Pending" ? (
                              <>
                                <button onClick={() => handleEdit(r)} style={editBtnStyle}>✏️ Edit</button>
                                <button onClick={() => handleDelete(r.officialEngagementApplicationId!)} style={deleteBtnStyle}>🗑️ Delete</button>
                              </>
                            ) : (
                              <button style={printBtnStyle}>🖨️</button>
                            )}
                          </td>
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
                <input type="date" value={form.dateFiled} readOnly required style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
              </div>
              <div className={styles.formGroup}>
                <label>Official Type</label>
                <select value={form.officialType} onChange={(e) => setForm({ ...form, officialType: e.target.value })}>
                  <option value="Official Business">Official Business</option>
                  <option value="Official Time">Official Time</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Start Time</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>End Time</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Details / Purpose</label>
                <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} required />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting..." : (editingId !== null ? "Update Application" : "File Application")}
                </button>
                <button type="button" onClick={() => { setForm({ dateFiled: today, officialType: "Official Business", startDate: today, startTime: "08:00", endDate: today, endTime: "17:00", details: "" }); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
                  {editingId !== null ? "Cancel Edit" : "Clear"}
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
const editBtnStyle: React.CSSProperties = { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", marginRight: "0.3rem", fontSize: "0.8rem" };
const deleteBtnStyle: React.CSSProperties = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", fontSize: "0.8rem" };
const printBtnStyle: React.CSSProperties = { background: "#6b7280", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", fontSize: "0.8rem" };
