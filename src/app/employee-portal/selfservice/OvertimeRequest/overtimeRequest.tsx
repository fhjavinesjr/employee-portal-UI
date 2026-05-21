"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = runtimeConfig.getApiUrl("hrm");

interface OvertimeRequestDTO {
  overtimeRequestId?: number;
  employeeId: number;
  dateFiled: string;
  dateTimeFrom: string;
  dateTimeTo: string;
  totalHours?: number;
  purpose: string;
  status: string;
  recommendedById?: number | null;
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    fetchRecords();
    fetchEmployeeNames();
  }, [fetchRecords, fetchEmployeeNames]);

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
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/overtime-request/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/overtime-request/create`;
      const res = await fetchWithAuth(url, {
        method: editingId !== null ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "Overtime request updated" : "Overtime request filed successfully" });
      setForm({ dateFiled: today, dateTimeFrom: nowLocal(), dateTimeTo: nowLocal(), purpose: "" });
      setEditingId(null);
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

  const handleEdit = (r: OvertimeRequestDTO) => {
    setEditingId(r.overtimeRequestId!);
    setForm({
      dateFiled: r.dateFiled,
      dateTimeFrom: (r.dateTimeFrom ?? "").replace(" ", "T").substring(0, 16),
      dateTimeTo: (r.dateTimeTo ?? "").replace(" ", "T").substring(0, 16),
      purpose: r.purpose,
    });
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this overtime request?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/overtime-request/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "Overtime request deleted" });
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
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
              {editingId !== null ? "Edit Request" : "File Request"}
            </button>
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No overtime request records found.</p>}
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
                            <th style={th}>From</th>
                            <th style={th}>To</th>
                            <th style={th}>Total Hours</th>
                            <th style={th}>Purpose</th>
                            <th style={th}>Status</th>
                            <th style={th}>Remarks</th>
                            <th style={th}>Recommending Officer</th>
                            <th style={th}>Approved By</th>
                            <th style={th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map((r) => (
                            <tr key={r.overtimeRequestId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={td}>{r.dateFiled}</td>
                              <td style={td}>{fmtDateTime(r.dateTimeFrom)}</td>
                              <td style={td}>{fmtDateTime(r.dateTimeTo)}</td>
                              <td style={td}>{r.totalHours?.toFixed(2)} hrs</td>
                              <td style={td}>{r.purpose}</td>
                              <td style={td}>{statusBadge(r.status)}</td>
                              <td style={td}>{r.approvalRemarks ?? "—"}</td>
                              <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                              <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                              <td style={td}>
                                {r.status === "Pending" ? (
                                  <>
                                    <button onClick={() => handleEdit(r)} style={editBtnStyle}>✏️ Edit</button>
                                    <button onClick={() => handleDelete(r.overtimeRequestId!)} style={deleteBtnStyle}>🗑️ Delete</button>
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
            </>
          )}

          {activeTab === "apply" && (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", maxWidth: 520 }}>
              <div className={styles.formGroup}>
                <label>Date Filed</label>
                <input type="date" value={form.dateFiled} readOnly className={styles.inputField} required style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
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
                  {isSubmitting ? "Submitting..." : (editingId !== null ? "Update Request" : "File Overtime Request")}
                </button>
                <button type="button" onClick={() => { setForm({ dateFiled: today, dateTimeFrom: nowLocal(), dateTimeTo: nowLocal(), purpose: "" }); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
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
