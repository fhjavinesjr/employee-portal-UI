"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = runtimeConfig.getApiUrl("hrm");

interface PassSlipDTO {
  passSlipId?: number;
  employeeId: number;
  dateFiled: string;
  passSlipDate: string;
  purpose: string;
  departureTime: string;
  arrivalTime: string;
  details: string;
  status: string;
  recommendedById?: number | null;
  approvedById?: number | null;
  approvalRemarks?: string | null;
}

interface FormState {
  dateFiled: string;
  passSlipDate: string;
  purpose: string;
  departureTime: string;
  arrivalTime: string;
  details: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function PassSlip() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<PassSlipDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<FormState>({
    dateFiled: today, passSlipDate: today, purpose: "Personal",
    departureTime: "", arrivalTime: "", details: "",
  });

  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/pass-slip/get-all/${empId}`);
      if (!res.ok) throw new Error();
      setRecords(await res.json());
    } catch { Toast.fire({ icon: "error", title: "Could not load pass slip records" }); }
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

  const handlePurposeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev, purpose: value,
      departureTime: value === "Official" ? "08:00" : prev.departureTime,
      arrivalTime: value === "Official" ? "17:00" : prev.arrivalTime,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) { Swal.fire({ icon: "warning", title: "Session expired. Please log in again." }); return; }
    if (!form.departureTime) { Swal.fire({ icon: "warning", title: "Departure time is required" }); return; }
    setIsSubmitting(true);
    try {
      const payload: PassSlipDTO = {
        employeeId: Number(empId), dateFiled: form.dateFiled,
        passSlipDate: form.passSlipDate, purpose: form.purpose,
        departureTime: form.departureTime + ":00",
        arrivalTime: form.arrivalTime ? form.arrivalTime + ":00" : "",
        details: form.details, status: "Pending",
      };
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/pass-slip/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/pass-slip/create`;
      const res = await fetchWithAuth(url, {
        method: editingId !== null ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "Pass slip updated" : "Pass slip filed successfully" });
      setForm({ dateFiled: today, passSlipDate: today, purpose: "Personal", departureTime: "", arrivalTime: "", details: "" });
      setEditingId(null);
      setActiveTab("table");
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file pass slip", text: err instanceof Error ? err.message : String(err) });
    } finally { setIsSubmitting(false); }
  };

  const statusBadge = (status: string) => {
    const color = status === "Approved" ? "#16a34a" : status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const handleEdit = (r: PassSlipDTO) => {
    setEditingId(r.passSlipId!);
    setForm({
      dateFiled: r.dateFiled,
      passSlipDate: r.passSlipDate,
      purpose: r.purpose,
      departureTime: r.departureTime?.substring(0, 5) ?? "",
      arrivalTime: r.arrivalTime?.substring(0, 5) ?? "",
      details: r.details,
    });
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this pass slip?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/pass-slip/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "Pass slip deleted" });
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
    }
  };

  const handlePrint = async (passSlipId?: number) => {
    if (!passSlipId) {
      Swal.fire({
        icon: "warning",
        title: "No record selected",
        text: "Please select a valid pass slip record to print.",
      });
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/pass-slip/report/${passSlipId}`);
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Failed to generate pass slip (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Print Failed",
        text: err instanceof Error ? err.message : "Unable to generate the selected Pass Slip.",
      });
    }
  };

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase();
    return r.dateFiled.toLowerCase().includes(q) || r.purpose.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="passSlipModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Pass Slip</h2>
        </div>
        <div className={modalStyles.modalBody}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            {(["table", "apply"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#1d4ed8" : "#374151", borderBottom: activeTab === tab ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}>
                {tab === "table" ? "My Pass Slips" : (editingId !== null ? "Edit Pass Slip" : "File Pass Slip")}
              </button>
            ))}
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No pass slip records found.</p>}
              {!isLoading && records.length > 0 && (
                <>
                  <div className={styles.tableToolbar}>
                    <input
                      type="text"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ border: "1px solid #ccc", borderRadius: 4, padding: "5px 10px", fontSize: "13px", minWidth: "180px" }}
                    />
                    <div className={styles.paginationControls}>
                      <label>Rows:</label>
                      <select className={styles.rowSelect} value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                        {[10, 25, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className={styles.recordInfo}>
                        {filteredRecords.length === 0 ? "0" : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredRecords.length)} of {filteredRecords.length}
                      </span>
                      <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</button>
                      <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
                      <span className={styles.pageIndicator}>Page {currentPage} of {totalPages || 1}</span>
                      <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
                      <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>Last</button>
                    </div>
                  </div>
                  {paginatedRecords.length === 0 ? (
                    <p>No results match your search.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9" }}>
                            <th style={th}>Date Filed</th>
                            <th style={th}>Pass Slip Date</th>
                            <th style={th}>Purpose</th>
                            <th style={th}>Departure</th>
                            <th style={th}>Arrival</th>
                            <th style={th}>Status</th>
                            <th style={th}>Remarks</th>
                            <th style={th}>Recommending Officer</th>
                            <th style={th}>Approved By</th>
                            <th style={th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map((r) => (
                            <tr key={r.passSlipId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={td}>{r.dateFiled}</td>
                              <td style={td}>{r.passSlipDate}</td>
                              <td style={td}>{r.purpose}</td>
                              <td style={td}>{r.departureTime?.substring(0, 5) ?? "—"}</td>
                              <td style={td}>{r.arrivalTime?.substring(0, 5) || "—"}</td>
                              <td style={td}>{statusBadge(r.status)}</td>
                              <td style={td}>{r.approvalRemarks ?? "—"}</td>
                              <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                              <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                              <td style={td}>
                                {r.status === "Pending" ? (
                                  <>
                                    <button onClick={() => handleEdit(r)} style={editBtnStyle}>✏️ Edit</button>
                                    <button onClick={() => handleDelete(r.passSlipId!)} style={deleteBtnStyle}>🗑️ Delete</button>
                                  </>
                                ) : r.status === "Approved" ? (
                                  <button
                                    type="button"
                                    onClick={() => handlePrint(r.passSlipId)}
                                    style={printBtnStyle}
                                    title="Print Pass Slip"
                                  >
                                    🖨️
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
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
                <label>Pass Slip Date</label>
                <input type="date" value={form.passSlipDate} onChange={(e) => setForm({ ...form, passSlipDate: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label>Purpose</label>
                <select value={form.purpose} onChange={handlePurposeChange}>
                  <option value="Personal">Personal</option>
                  <option value="Official">Official</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={styles.formGroup}>
                  <label>Departure Time</label>
                  <input type="time" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                    disabled={form.purpose === "Official"} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Arrival Time</label>
                  <input type="time" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                    disabled={form.purpose === "Official"} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Details</label>
                <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting..." : (editingId !== null ? "Update Pass Slip" : "File Pass Slip")}
                </button>
                <button type="button" onClick={() => { setForm({ dateFiled: today, passSlipDate: today, purpose: "Personal", departureTime: "", arrivalTime: "", details: "" }); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
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
