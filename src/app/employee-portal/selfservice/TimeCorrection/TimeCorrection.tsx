"use client";

import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import modalStyles from "@/styles/Modal.module.scss";
import styles from "@/styles/LeaveApplication.module.scss";
import Tstyle from "@/styles/TimeCorrection.module.scss";
import to12HourFormat from "@/lib/utils/convert24To12HrFormat";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

interface TimeCorrectionDTO {
  timeCorrectionId?: number;
  employeeId: number;
  dateFiled: string;
  workDate: string;
  correctedTimeIn: string;
  correctedBreakOut?: string | null;
  correctedBreakIn?: string | null;
  correctedTimeOut: string;
  reason: string;
  status: string;
  recommendedById?: number | null;
  approvedById?: number | null;
  approvalRemarks?: string | null;
}

type TimeField = { hour: string; minute: string };

interface FormState {
  dateFiled: string;
  workDate: string;
  correctedTimeIn: TimeField;
  correctedBreakOut: TimeField;
  correctedBreakIn: TimeField;
  correctedTimeOut: TimeField;
  reason: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function TimeCorrection() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<TimeCorrectionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());

  const today = new Date().toISOString().split("T")[0];
  const defaultForm: FormState = {
    dateFiled: today, workDate: today,
    correctedTimeIn: { hour: "08", minute: "00" },
    correctedBreakOut: { hour: "", minute: "" },
    correctedBreakIn: { hour: "", minute: "" },
    correctedTimeOut: { hour: "17", minute: "00" },
    reason: "",
  };
  const [form, setForm] = useState<FormState>(defaultForm);

  const setTimeField = (
    field: "correctedTimeIn" | "correctedBreakOut" | "correctedBreakIn" | "correctedTimeOut",
    part: "hour" | "minute",
    value: string
  ) => setForm((prev) => ({ ...prev, [field]: { ...(prev[field] as TimeField), [part]: value } }));

  const to12 = (t: TimeField) => t.hour && t.minute ? to12HourFormat(`${t.hour}:${t.minute}`) : "";
  const toTimeString = (t: TimeField) => t.hour && t.minute ? `${t.hour}:${t.minute}:00` : null;
  const parseTime = (t: string | null | undefined) => t ? t.substring(0, 5) : "—";

  const renderTimeSelect = (
    field: "correctedTimeIn" | "correctedBreakOut" | "correctedBreakIn" | "correctedTimeOut"
  ) => {
    const val = form[field] as TimeField;
    return (
      <div>
        <div className={Tstyle.timeGroup}>
          <select className={Tstyle.timeSelect} value={val.hour} onChange={(e) => setTimeField(field, "hour", e.target.value)}>
            <option value="">--</option>
            {hours.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span className={Tstyle.timeColon}>:</span>
          <select className={Tstyle.timeSelect} value={val.minute} onChange={(e) => setTimeField(field, "minute", e.target.value)}>
            <option value="">--</option>
            {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {val.hour && val.minute && <span className={Tstyle.time12Label}>{to12(val)}</span>}
      </div>
    );
  };

  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/time-correction/get-all/${empId}`);
      if (!res.ok) throw new Error();
      setRecords(await res.json());
    } catch { Toast.fire({ icon: "error", title: "Could not load time correction records" }); }
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
    if (!form.reason.trim()) { Swal.fire({ icon: "warning", title: "Please provide a reason for the correction" }); return; }
    if (!toTimeString(form.correctedTimeIn) || !toTimeString(form.correctedTimeOut)) {
      Swal.fire({ icon: "warning", title: "Time In and Time Out are required" }); return;
    }
    setIsSubmitting(true);
    try {
      const payload: TimeCorrectionDTO = {
        employeeId: Number(empId), dateFiled: form.dateFiled, workDate: form.workDate,
        correctedTimeIn: toTimeString(form.correctedTimeIn)!,
        correctedBreakOut: toTimeString(form.correctedBreakOut),
        correctedBreakIn: toTimeString(form.correctedBreakIn),
        correctedTimeOut: toTimeString(form.correctedTimeOut)!,
        reason: form.reason, status: "Pending",
      };
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/time-correction/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/time-correction/create`;
      const res = await fetchWithAuth(url, {
        method: editingId !== null ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "Time correction updated" : "Time correction filed successfully" });
      setForm(defaultForm);
      setEditingId(null);
      setActiveTab("table");
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file time correction", text: err instanceof Error ? err.message : String(err) });
    } finally { setIsSubmitting(false); }
  };

  const statusBadge = (status: string) => {
    const color = status === "Approved" ? "#16a34a" : status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const parseToTimeField = (t: string | null | undefined): TimeField => {
    if (!t) return { hour: "", minute: "" };
    const parts = t.substring(0, 5).split(":");
    return { hour: parts[0] ?? "", minute: parts[1] ?? "" };
  };

  const handleEdit = (r: TimeCorrectionDTO) => {
    setEditingId(r.timeCorrectionId!);
    setForm({
      dateFiled: r.dateFiled,
      workDate: r.workDate,
      correctedTimeIn: parseToTimeField(r.correctedTimeIn as unknown as string),
      correctedBreakOut: parseToTimeField(r.correctedBreakOut as unknown as string),
      correctedBreakIn: parseToTimeField(r.correctedBreakIn as unknown as string),
      correctedTimeOut: parseToTimeField(r.correctedTimeOut as unknown as string),
      reason: r.reason,
    });
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this time correction?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/time-correction/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "Time correction deleted" });
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
    }
  };

  return (
    <div id="timecorrectionModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Time Correction</h2>
        </div>
        <div className={modalStyles.modalBody}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            {(["table", "apply"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#1d4ed8" : "#374151", borderBottom: activeTab === tab ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}>
                {tab === "table" ? "My Requests" : (editingId !== null ? "Edit Correction" : "File Correction")}
              </button>
            ))}
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No time correction records found.</p>}
              {!isLoading && records.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={th}>Date Filed</th>
                        <th style={th}>Work Date</th>
                        <th style={th}>Time In</th>
                        <th style={th}>Break Out</th>
                        <th style={th}>Break In</th>
                        <th style={th}>Time Out</th>
                        <th style={th}>Status</th>
                        <th style={th}>Remarks</th>
                        <th style={th}>Recommending Officer</th>
                        <th style={th}>Approved By</th>
                        <th style={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.timeCorrectionId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={td}>{r.dateFiled}</td>
                          <td style={td}>{r.workDate}</td>
                          <td style={td}>{parseTime(r.correctedTimeIn as unknown as string)}</td>
                          <td style={td}>{parseTime(r.correctedBreakOut as unknown as string)}</td>
                          <td style={td}>{parseTime(r.correctedBreakIn as unknown as string)}</td>
                          <td style={td}>{parseTime(r.correctedTimeOut as unknown as string)}</td>
                          <td style={td}>{statusBadge(r.status)}</td>
                          <td style={td}>{r.approvalRemarks ?? "—"}</td>
                          <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                          <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                          <td style={td}>
                            {r.status === "Pending" ? (
                              <>
                                <button onClick={() => handleEdit(r)} style={editBtnStyle}>✏️ Edit</button>
                                <button onClick={() => handleDelete(r.timeCorrectionId!)} style={deleteBtnStyle}>🗑️ Delete</button>
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
              <div className={Tstyle.formRow}>
                <label>Date Filed</label>
                <input type="date" value={form.dateFiled} readOnly required
                  style={{ padding: "0.35rem 0.5rem", borderRadius: 4, border: "1px solid #d1d5db", background: "#f3f4f6", cursor: "not-allowed" }} />
              </div>
              <div className={Tstyle.formRow}>
                <label>Work Date</label>
                <input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} required
                  style={{ padding: "0.35rem 0.5rem", borderRadius: 4, border: "1px solid #d1d5db" }} />
              </div>
              <div className={Tstyle.formRow}><label>Time In</label>{renderTimeSelect("correctedTimeIn")}</div>
              <div className={Tstyle.formRow}>
                <label>Break Out <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "#6b7280" }}>(optional)</span></label>
                {renderTimeSelect("correctedBreakOut")}
              </div>
              <div className={Tstyle.formRow}>
                <label>Break In <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "#6b7280" }}>(optional)</span></label>
                {renderTimeSelect("correctedBreakIn")}
              </div>
              <div className={Tstyle.formRow}><label>Time Out</label>{renderTimeSelect("correctedTimeOut")}</div>
              <div className={styles.formGroup}>
                <label>Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} required />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting..." : (editingId !== null ? "Update Correction" : "File Time Correction")}
                </button>
                <button type="button" onClick={() => { setForm(defaultForm); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
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
