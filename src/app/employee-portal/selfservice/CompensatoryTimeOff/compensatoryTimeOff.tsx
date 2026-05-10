"use client";

import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

interface CtoDTO {
  ctoId?: number;
  employeeId: number;
  dateFiled: string;
  dateOfOffset: string;
  hoursUsed: number;
  reason: string;
  status: string;
  recommendedById?: number | null;
  approvedById?: number | null;
  approvalRemarks?: string | null;
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function CompensatoryTimeOff() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<CtoDTO[]>([]);
  const [cocBalance, setCocBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ dateFiled: today, dateOfOffset: today, hoursUsed: "8", reason: "" });

  const fetchBalance = useCallback(async (empId: number) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/balance/${empId}`);
      if (!res.ok) return;
      const data = await res.json();
      setCocBalance(data.availableHours ?? 0);
    } catch { setCocBalance(null); }
  }, []);

  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/cto/get-all/${empId}`);
      if (!res.ok) throw new Error();
      setRecords(await res.json());
    } catch { Toast.fire({ icon: "error", title: "Could not load CTO records" }); }
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

  useEffect(() => {
    const empId = localStorageUtil.getEmployeeId();
    if (empId) { fetchRecords(); fetchBalance(empId); fetchEmployeeNames(); }
  }, [fetchRecords, fetchBalance, fetchEmployeeNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) { Swal.fire({ icon: "warning", title: "Session expired. Please log in again." }); return; }
    const hrs = parseFloat(form.hoursUsed);
    if (isNaN(hrs) || hrs <= 0) { Swal.fire({ icon: "warning", title: "Enter valid hours to offset" }); return; }
    if (cocBalance !== null && hrs > cocBalance) {
      Swal.fire({ icon: "error", title: "Insufficient COC Balance", text: `Requested ${hrs} hrs but only ${cocBalance.toFixed(2)} hrs available.` });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CtoDTO = {
        employeeId: Number(empId), dateFiled: form.dateFiled,
        dateOfOffset: form.dateOfOffset, hoursUsed: hrs,
        reason: form.reason, status: "Pending",
      };
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/cto/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/cto/create`;
      const res = await fetchWithAuth(url, { method: editingId !== null ? "PUT" : "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "CTO application updated" : "CTO application filed successfully" });
      setForm({ dateFiled: today, dateOfOffset: today, hoursUsed: "8", reason: "" });
      setEditingId(null);
      setActiveTab("table");
      fetchRecords();
      fetchBalance(empId);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file CTO application", text: err instanceof Error ? err.message : String(err) });
    } finally { setIsSubmitting(false); }
  };

  const statusBadge = (status: string) => {
    const color = status === "Approved" ? "#16a34a" : status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const handleEdit = (r: CtoDTO) => {
    setEditingId(r.ctoId!);
    setForm({
      dateFiled: r.dateFiled,
      dateOfOffset: r.dateOfOffset,
      hoursUsed: String(r.hoursUsed),
      reason: r.reason,
    });
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this CTO application?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/cto/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "CTO application deleted" });
      const empId = localStorageUtil.getEmployeeId();
      fetchRecords();
      if (empId) fetchBalance(empId);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
    }
  };

  return (
    <div className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Compensatory Time Off</h2>
        </div>
        <div className={modalStyles.modalBody}>
          {/* COC Balance banner */}
          <div style={{ marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "#eff6ff", borderRadius: 6, fontSize: "0.9rem", color: "#1d4ed8", fontWeight: 500 }}>
            COC Balance: {cocBalance == null ? "Loading…" : `${cocBalance.toFixed(3)} hrs`}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            {(["table", "apply"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#1d4ed8" : "#374151", borderBottom: activeTab === tab ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}>
                {tab === "table" ? "My Applications" : (editingId !== null ? "Edit CTO" : "File CTO")}
              </button>
            ))}
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No CTO records found.</p>}
              {!isLoading && records.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={th}>Date Filed</th>
                        <th style={th}>Date of Offset</th>
                        <th style={th}>Hours Used</th>
                        <th style={th}>Reason</th>
                        <th style={th}>Status</th>
                        <th style={th}>Remarks</th>
                        <th style={th}>Recommending Officer</th>
                        <th style={th}>Approved By</th>
                        <th style={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.ctoId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={td}>{r.dateFiled}</td>
                          <td style={td}>{r.dateOfOffset}</td>
                          <td style={td}>{r.hoursUsed} hrs</td>
                          <td style={td}>{r.reason}</td>
                          <td style={td}>{statusBadge(r.status)}</td>
                          <td style={td}>{r.approvalRemarks ?? "—"}</td>
                          <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                          <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                          <td style={td}>
                            {r.status === "Pending" ? (
                              <>
                                <button onClick={() => handleEdit(r)} style={editBtnStyle}>✏️ Edit</button>
                                <button onClick={() => handleDelete(r.ctoId!)} style={deleteBtnStyle}>🗑️ Delete</button>
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
                <label>Date of Offset</label>
                <input type="date" value={form.dateOfOffset} onChange={(e) => setForm({ ...form, dateOfOffset: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label>Hours to Use</label>
                <input type="number" min="1" max={cocBalance ?? undefined} step="0.5" value={form.hoursUsed}
                  onChange={(e) => setForm({ ...form, hoursUsed: e.target.value })} required />
                {cocBalance !== null && <small style={{ color: "#6b7280" }}>Available: {cocBalance.toFixed(3)} hrs</small>}
              </div>
              <div className={styles.formGroup}>
                <label>Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} required />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting..." : (editingId !== null ? "Update CTO" : "File CTO Application")}
                </button>
                <button type="button" onClick={() => { setForm({ dateFiled: today, dateOfOffset: today, hoursUsed: "8", reason: "" }); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
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
