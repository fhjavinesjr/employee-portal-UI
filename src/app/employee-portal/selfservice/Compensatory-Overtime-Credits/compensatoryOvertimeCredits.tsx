"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = runtimeConfig.getApiUrl("hrm");

interface CocDTO {
  cocId?: number;
  employeeId: number;
  dateFiled: string;
  dateWorked: string;
  hoursWorked: number;
  reason: string;
  workType: string;
  overtimeRequestId?: number | null;
  status: string;
  recommendedById?: number | null;
  approvedById?: number | null;
  approvalRemarks?: string | null;
  currentBalance?: number;
}

interface OvertimeRequestDTO {
  overtimeRequestId: number;
  dateTimeFrom: string;
  dateTimeTo: string;
  totalHours: number;
  purpose: string;
}

interface FormState {
  dateFiled: string;
  dateWorked: string;
  hoursWorked: string;
  reason: string;
  workType: string;
  overtimeRequestId: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function COC() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<CocDTO[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [approvedOTRequests, setApprovedOTRequests] = useState<OvertimeRequestDTO[]>([]);
  const [isFetchingOT, setIsFetchingOT] = useState(false);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const today = new Date().toISOString().split("T")[0];
  const defaultForm: FormState = {
    dateFiled: today, dateWorked: today,
    hoursWorked: "8", reason: "",
    workType: "HOLIDAY_DUTY", overtimeRequestId: "",
  };
  const [form, setForm] = useState<FormState>(defaultForm);

  const fetchBalance = useCallback(async (empId: string | number) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/balance/${empId}`);
      if (!res.ok) return;
      const data = await res.json();
      setAvailableBalance(data.availableHours ?? 0);
    } catch {
      setAvailableBalance(null);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/get-all/${empId}`);
      if (!res.ok) throw new Error();
      setRecords(await res.json());
    } catch {
      Toast.fire({ icon: "error", title: "Could not load COC records" });
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
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    fetchRecords();
    fetchBalance(empId);
    fetchEmployeeNames();
  }, [fetchRecords, fetchBalance, fetchEmployeeNames]);

  const handleWorkTypeChange = useCallback(async (workType: string) => {
    setForm((prev) => ({ ...prev, workType, overtimeRequestId: "" }));
    if (workType === "OVERTIME") {
      const empId = localStorageUtil.getEmployeeId();
      if (!empId) return;
      setIsFetchingOT(true);
      try {
        const res = await fetchWithAuth(
          `${API_BASE_URL_HRM}/api/overtime-request/get-approved/${empId}`
        );
        if (res.ok) {
          const data: OvertimeRequestDTO[] = await res.json();
          setApprovedOTRequests(data);
          if (data.length === 0) {
            Swal.fire({
              icon: "info",
              title: "No Approved Overtime Requests",
              text: "You have no approved overtime orders to reference. Please file and get an Overtime Request approved first.",
            });
          }
        }
      } catch {
        Toast.fire({ icon: "error", title: "Could not load overtime requests" });
      } finally {
        setIsFetchingOT(false);
      }
    } else {
      setApprovedOTRequests([]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) { Swal.fire({ icon: "warning", title: "Session expired. Please log in again." }); return; }
    const hrs = parseFloat(form.hoursWorked);
    if (isNaN(hrs) || hrs <= 0) { Swal.fire({ icon: "warning", title: "Enter valid hours worked" }); return; }
    if (form.workType === "OVERTIME" && !form.overtimeRequestId) {
      Swal.fire({ icon: "warning", title: "Please select an approved overtime order" }); return;
    }
    setIsSubmitting(true);
    try {
      const payload: CocDTO = {
        employeeId: Number(empId),
        dateFiled: form.dateFiled,
        dateWorked: form.dateWorked,
        hoursWorked: hrs,
        reason: form.reason,
        workType: form.workType,
        overtimeRequestId: form.overtimeRequestId ? Number(form.overtimeRequestId) : null,
        status: "Pending",
      };
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/coc/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/coc/create`;
      const res = await fetchWithAuth(url, {
        method: editingId !== null ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "COC application updated" : "COC application filed successfully" });
      setForm(defaultForm);
      setApprovedOTRequests([]);
      setEditingId(null);
      setActiveTab("table");
      fetchRecords();
      fetchBalance(empId);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file COC application", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const color = status === "Approved" ? "#16a34a" : status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const handleEdit = (r: CocDTO) => {
    setEditingId(r.cocId!);
    setForm({
      dateFiled: r.dateFiled,
      dateWorked: r.dateWorked,
      hoursWorked: String(r.hoursWorked),
      reason: r.reason,
      workType: r.workType,
      overtimeRequestId: r.overtimeRequestId ? String(r.overtimeRequestId) : "",
    });
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this COC application?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "COC application deleted" });
      const empId = localStorageUtil.getEmployeeId();
      fetchRecords();
      if (empId) fetchBalance(empId);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
    }
  };

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase();
    return r.dateFiled.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="cocModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Compensatory Overtime Credit (COC)</h2>
        </div>
        <div className={modalStyles.modalBody}>
          {/* Balance banner */}
          {availableBalance !== null && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "0.5rem 0.875rem", marginBottom: "0.75rem", display: "inline-block" }}>
              <span style={{ fontWeight: 700, color: availableBalance <= 0 ? "#dc2626" : "#1d4ed8" }}>
                Available COC Balance: {availableBalance.toFixed(3)} hrs
              </span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            {(["table", "apply"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#1d4ed8" : "#374151", borderBottom: activeTab === tab ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}>
                {tab === "table" ? "My COC Records" : (editingId !== null ? "Edit COC" : "File COC")}
              </button>
            ))}
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No COC records found.</p>}
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
                            <th style={th}>Date Worked</th>
                            <th style={th}>Hours</th>
                            <th style={th}>Type</th>
                            <th style={th}>Reason</th>
                            <th style={th}>Status</th>
                            <th style={th}>Remarks</th>
                            <th style={th}>Recommending Officer</th>
                            <th style={th}>Approved By</th>
                            <th style={th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map((r) => (
                            <tr key={r.cocId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={td}>{r.dateFiled}</td>
                              <td style={td}>{r.dateWorked}</td>
                              <td style={td}>{r.hoursWorked}</td>
                              <td style={td}>{r.workType === "HOLIDAY_DUTY" ? "Holiday Duty" : "Overtime"}</td>
                              <td style={td}>{r.reason}</td>
                              <td style={td}>{statusBadge(r.status)}</td>
                              <td style={td}>{r.approvalRemarks ?? "—"}</td>
                              <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                              <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                              <td style={td}>
                                {r.status === "Pending" ? (
                                  <>
                                    <button onClick={() => handleEdit(r)} style={editBtnStyle}>✏️ Edit</button>
                                    <button onClick={() => handleDelete(r.cocId!)} style={deleteBtnStyle}>🗑️ Delete</button>
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
                <input type="date" value={form.dateFiled} readOnly required style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
              </div>
              <div className={styles.formGroup}>
                <label>Work Type</label>
                <select value={form.workType} onChange={(e) => handleWorkTypeChange(e.target.value)}>
                  <option value="HOLIDAY_DUTY">Holiday Duty</option>
                  <option value="OVERTIME">Overtime</option>
                </select>
              </div>
              {form.workType === "OVERTIME" && (
                <div className={styles.formGroup}>
                  <label>Reference Approved Overtime Order</label>
                  {isFetchingOT && <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>Loading approved overtime requests...</p>}
                  {!isFetchingOT && approvedOTRequests.length === 0 && (
                    <p style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                      No approved overtime orders found. File an Overtime Request first.
                    </p>
                  )}
                  {!isFetchingOT && approvedOTRequests.length > 0 && (
                    <select value={form.overtimeRequestId}
                      onChange={(e) => {
                        const selected = approvedOTRequests.find((ot) => ot.overtimeRequestId === Number(e.target.value));
                        setForm((prev) => ({
                          ...prev, overtimeRequestId: e.target.value,
                          dateWorked: selected ? selected.dateTimeFrom.substring(0, 10) : prev.dateWorked,
                          hoursWorked: selected ? String(selected.totalHours) : prev.hoursWorked,
                        }));
                      }} required>
                      <option value="">— Select Overtime Order —</option>
                      {approvedOTRequests.map((ot) => (
                        <option key={ot.overtimeRequestId} value={ot.overtimeRequestId}>
                          {ot.dateTimeFrom.substring(0, 16)} → {ot.dateTimeTo.substring(0, 16)} ({ot.totalHours.toFixed(2)} hrs)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Date Worked (Holiday / Overtime Date)</label>
                <input type="date" value={form.dateWorked} onChange={(e) => setForm({ ...form, dateWorked: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label>Hours Worked</label>
                <input type="number" step="0.5" min="0.5" max="24" value={form.hoursWorked}
                  onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label>Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} required />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting..." : (editingId !== null ? "Update COC" : "File COC")}
                </button>
                <button type="button" onClick={() => { setForm(defaultForm); setApprovedOTRequests([]); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
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
