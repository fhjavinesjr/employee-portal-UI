"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  actualHoursWorked?: number | null;
  cocMultiplier?: number | null;
  status: string;
  recommendationStatus?: string | null;
  recommendedById?: number | null;
  recommendationRemarks?: string | null;
  approvedById?: number | null;
  approvalRemarks?: string | null;
  currentBalance?: number;
}

interface OvertimeRequestDTO {
  overtimeRequestId: number;
  dateTimeFrom: string;
  dateTimeTo: string;
  totalHours: number;
  netAuthorizedHours?: number | null;
  purpose?: string | null;
  workType?: string | null;
  authorityReference?: string | null;
}

interface CocPreview {
  overtimeRequestId: number;
  dateWorked: string;
  workType: string;
  authorizedHours: number;
  actualHoursWorked: number;
  cocMultiplier: number;
  creditedHours: number;
  authorityReference?: string;
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

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const makeDefaultForm = (): FormState => ({
  dateFiled: localDate(),
  dateWorked: "",
  hoursWorked: "0",
  reason: "",
  workType: "",
  overtimeRequestId: "",
});

const errorMessage = async (response: Response) => {
  const text = await response.text();
  if (!text) return `Request failed (${response.status})`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
};

export default function COC() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<CocDTO[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [approvedAuthorities, setApprovedAuthorities] = useState<OvertimeRequestDTO[]>([]);
  const [preview, setPreview] = useState<CocPreview | null>(null);
  const [form, setForm] = useState<FormState>(makeDefaultForm);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAuthorities, setIsFetchingAuthorities] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const employeeId = localStorageUtil.getEmployeeId();

  const resetForm = useCallback(() => {
    setForm(makeDefaultForm());
    setPreview(null);
  }, []);

  const fetchBalance = useCallback(async (empId: string | number) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/balance/${empId}`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { availableHours?: number };
      setAvailableBalance(data.availableHours ?? 0);
    } catch {
      setAvailableBalance(null);
    }
  }, []);

  const fetchRecords = useCallback(async (empId: string | number) => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/get-all/${empId}`);
      if (!response.ok) throw new Error(await errorMessage(response));
      const data = (await response.json()) as CocDTO[];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      Toast.fire({ icon: "error", title: "Could not load COC records" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchApprovedAuthorities = useCallback(async (empId: string | number) => {
    setIsFetchingAuthorities(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL_HRM}/api/overtime-request/get-approved/${empId}`,
      );
      if (!response.ok) throw new Error(await errorMessage(response));
      const data = (await response.json()) as OvertimeRequestDTO[];
      setApprovedAuthorities(Array.isArray(data) ? data : []);
    } catch {
      setApprovedAuthorities([]);
      Toast.fire({ icon: "error", title: "Could not load approved overtime/duty orders" });
    } finally {
      setIsFetchingAuthorities(false);
    }
  }, []);

  const fetchEmployeeNames = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/employees/basicInfo`);
      if (!response.ok) return;
      const data = (await response.json()) as Array<{
        employeeId: number;
        fullName?: string;
        firstname?: string;
        lastname?: string;
      }>;
      const names = new Map<number, string>();
      data.forEach((employee) => {
        const name =
          employee.fullName?.trim() ||
          [employee.firstname, employee.lastname].filter(Boolean).join(" ").trim();
        if (employee.employeeId && name) names.set(employee.employeeId, name);
      });
      setNameMap(names);
    } catch {
      // Officer names are supplementary; IDs remain available if this lookup fails.
    }
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    void fetchRecords(employeeId);
    void fetchBalance(employeeId);
    void fetchApprovedAuthorities(employeeId);
    void fetchEmployeeNames();
  }, [employeeId, fetchApprovedAuthorities, fetchBalance, fetchEmployeeNames, fetchRecords]);

  const unusedAuthorities = useMemo(
    () =>
      approvedAuthorities.filter(
        (authority) =>
          !records.some(
            (record) =>
              record.overtimeRequestId === authority.overtimeRequestId &&
              record.status.toLowerCase() !== "disapproved",
          ),
      ),
    [approvedAuthorities, records],
  );

  const handleAuthorityChange = async (value: string) => {
    setPreview(null);
    setForm((current) => ({
      ...current,
      overtimeRequestId: value,
      dateWorked: "",
      hoursWorked: "0",
      reason: "",
      workType: "",
    }));

    if (!value || !employeeId) return;
    setIsPreviewing(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL_HRM}/api/coc/preview/${value}/${employeeId}`,
      );
      if (!response.ok) throw new Error(await errorMessage(response));

      const computed = (await response.json()) as CocPreview;
      const authority = approvedAuthorities.find(
        (item) => String(item.overtimeRequestId) === value,
      );
      setPreview(computed);
      setForm((current) => ({
        ...current,
        overtimeRequestId: value,
        dateWorked: computed.dateWorked,
        hoursWorked: String(computed.creditedHours),
        workType: computed.workType,
        reason: authority?.purpose?.trim() || "Approved overtime/duty authority",
      }));
    } catch (error) {
      resetForm();
      Swal.fire({
        icon: "error",
        title: "Unable to validate DTR",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeId) {
      Swal.fire({ icon: "warning", title: "Session expired. Please log in again." });
      return;
    }
    if (!form.overtimeRequestId || !preview) {
      Swal.fire({
        icon: "warning",
        title: "Approved authority is required",
        text: "Select an approved Overtime / Duty Order and wait for DTR validation.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/create`, {
        method: "POST",
        body: JSON.stringify({
          employeeId: Number(employeeId),
          dateFiled: form.dateFiled,
          overtimeRequestId: Number(form.overtimeRequestId),
          reason: form.reason,
          status: "Pending",
          recommendationStatus: "Pending",
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));

      Toast.fire({ icon: "success", title: "COC application filed successfully" });
      resetForm();
      setActiveTab("table");
      await Promise.all([
        fetchRecords(employeeId),
        fetchBalance(employeeId),
        fetchApprovedAuthorities(employeeId),
      ]);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to file COC application",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (record: CocDTO) => {
    if (!record.cocId) return;
    if ((record.recommendationStatus ?? "Pending").toLowerCase() === "recommended") {
      Toast.fire({ icon: "warning", title: "A recommended filing can no longer be deleted" });
      return;
    }
    const confirmation = await Swal.fire({
      title: "Delete this COC application?",
      text: "You may file again using the approved authority after deletion.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/delete/${record.cocId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      Toast.fire({ icon: "success", title: "COC application deleted" });
      if (employeeId) {
        await Promise.all([
          fetchRecords(employeeId),
          fetchBalance(employeeId),
          fetchApprovedAuthorities(employeeId),
        ]);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to delete COC application",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handlePrint = async (record: CocDTO) => {
    if (!record.cocId) return;
    const finalStatus = record.status.toLowerCase();
    if (finalStatus !== "approved" && finalStatus !== "disapproved") {
      Toast.fire({ icon: "warning", title: "Only final COC records can be printed" });
      return;
    }

    setPrintingId(record.cocId);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/report/${record.cocId}`);
      if (!response.ok) throw new Error(await errorMessage(response));
      const pdf = await response.blob();
      const url = window.URL.createObjectURL(pdf);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `CertificateCOC_${record.cocId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Unable to generate COC certificate",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPrintingId(null);
    }
  };

  const workflowStatus = (record: CocDTO) => {
    if (record.status.toLowerCase() === "approved") return { label: "Approved", color: "#16a34a" };
    if (record.status.toLowerCase() === "disapproved") return { label: "Disapproved", color: "#dc2626" };
    if ((record.recommendationStatus ?? "").toLowerCase() === "recommended") {
      return { label: "For Final Approval", color: "#2563eb" };
    }
    return { label: "For IS Recommendation", color: "#ca8a04" };
  };

  useEffect(() => setCurrentPage(1), [search, itemsPerPage]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => {
      const stage = workflowStatus(record).label;
      return [record.dateFiled, record.dateWorked, record.reason, record.workType, stage]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="cocModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Compensatory Overtime Credit (COC)</h2>
        </div>
        <div className={modalStyles.modalBody}>
          {availableBalance !== null && (
            <div style={balanceBannerStyle}>
              <span style={{ fontWeight: 700, color: availableBalance <= 0 ? "#dc2626" : "#1d4ed8" }}>
                Available COC Balance: {availableBalance.toFixed(2)} hrs
              </span>
            </div>
          )}

          <div style={tabBarStyle}>
            <button type="button" onClick={() => setActiveTab("table")} style={tabStyle(activeTab === "table")}>
              My COC Records
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab("apply");
              }}
              style={tabStyle(activeTab === "apply")}
            >
              File COC
            </button>
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
                      placeholder="Search records…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      style={searchStyle}
                    />
                    <div className={styles.paginationControls}>
                      <label>Rows:</label>
                      <select
                        className={styles.rowSelect}
                        value={itemsPerPage}
                        onChange={(event) => setItemsPerPage(Number(event.target.value))}
                      >
                        {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                      <span className={styles.recordInfo}>
                        {filteredRecords.length === 0 ? 0 : startIndex + 1}–
                        {Math.min(startIndex + itemsPerPage, filteredRecords.length)} of {filteredRecords.length}
                      </span>
                      <button className={styles.pageBtn} disabled={safePage === 1} onClick={() => setCurrentPage(1)}>First</button>
                      <button className={styles.pageBtn} disabled={safePage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Prev</button>
                      <span className={styles.pageIndicator}>Page {safePage} of {totalPages}</span>
                      <button className={styles.pageBtn} disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
                      <button className={styles.pageBtn} disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)}>Last</button>
                    </div>
                  </div>

                  {paginatedRecords.length === 0 ? <p>No results match your search.</p> : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9" }}>
                            <th style={th}>Date Filed</th>
                            <th style={th}>Date Worked</th>
                            <th style={th}>COC Hours</th>
                            <th style={th}>Work Type</th>
                            <th style={th}>Purpose</th>
                            <th style={th}>Status</th>
                            <th style={th}>IS Officer</th>
                            <th style={th}>Final Approver</th>
                            <th style={th}>Remarks</th>
                            <th style={th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map((record) => {
                            const stage = workflowStatus(record);
                            const mayDelete =
                              record.status.toLowerCase() === "pending" &&
                              (record.recommendationStatus ?? "Pending").toLowerCase() !== "recommended";
                            const mayPrint = ["approved", "disapproved"].includes(record.status.toLowerCase());
                            return (
                              <tr key={record.cocId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={td}>{record.dateFiled}</td>
                                <td style={td}>{record.dateWorked}</td>
                                <td style={td}>{Number(record.hoursWorked).toFixed(2)}</td>
                                <td style={td}>{record.workType?.replaceAll("_", " ") || "—"}</td>
                                <td style={td}>{record.reason || "—"}</td>
                                <td style={td}><span style={{ color: stage.color, fontWeight: 600 }}>{stage.label}</span></td>
                                <td style={td}>{record.recommendedById ? nameMap.get(record.recommendedById) ?? `#${record.recommendedById}` : "—"}</td>
                                <td style={td}>{record.approvedById ? nameMap.get(record.approvedById) ?? `#${record.approvedById}` : "—"}</td>
                                <td style={td}>{record.approvalRemarks || record.recommendationRemarks || "—"}</td>
                                <td style={td}>
                                  {mayDelete && <button type="button" onClick={() => void handleDelete(record)} style={deleteBtnStyle}>Delete</button>}
                                  {mayPrint && (
                                    <button
                                      type="button"
                                      onClick={() => void handlePrint(record)}
                                      disabled={printingId === record.cocId}
                                      style={printBtnStyle}
                                    >
                                      {printingId === record.cocId ? "Preparing…" : "Print PDF"}
                                    </button>
                                  )}
                                  {!mayDelete && !mayPrint && "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "apply" && (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", maxWidth: 560 }}>
              <div className={styles.formGroup}>
                <label>Date Filed</label>
                <input type="date" value={form.dateFiled} readOnly required style={readOnlyStyle} />
              </div>

              <div className={styles.formGroup}>
                <label>Reference Approved Overtime / Duty Order</label>
                <select
                  value={form.overtimeRequestId}
                  onChange={(event) => void handleAuthorityChange(event.target.value)}
                  disabled={isFetchingAuthorities || isPreviewing}
                  required
                >
                  <option value="">
                    {isFetchingAuthorities ? "Loading approved authorities…" : "— Select Approved Authority —"}
                  </option>
                  {unusedAuthorities.map((authority) => (
                    <option key={authority.overtimeRequestId} value={authority.overtimeRequestId}>
                      {authority.authorityReference ? `${authority.authorityReference} — ` : ""}
                      {(authority.workType ?? "OVERTIME").replaceAll("_", " ")} — {authority.dateTimeFrom.substring(0, 16)} → {authority.dateTimeTo.substring(0, 16)} ({Number(authority.netAuthorizedHours ?? authority.totalHours).toFixed(2)} authorized hrs)
                    </option>
                  ))}
                </select>
                {!isFetchingAuthorities && unusedAuthorities.length === 0 && (
                  <p style={hintErrorStyle}>No unused approved Overtime/Duty authority is available for COC filing.</p>
                )}
                {isPreviewing && <p style={hintStyle}>Validating rendered time against processed DTR…</p>}
              </div>

              {preview && (
                <div style={previewStyle}>
                  <strong>System-computed COC</strong>
                  <div>Authorized hours: {Number(preview.authorizedHours).toFixed(2)}</div>
                  <div>Actual eligible DTR hours: {Number(preview.actualHoursWorked).toFixed(2)}</div>
                  <div>COC multiplier: {Number(preview.cocMultiplier).toFixed(2)}</div>
                  <div><strong>COC hours to credit: {Number(preview.creditedHours).toFixed(2)}</strong></div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Work Type (from approved authority)</label>
                <input type="text" value={form.workType ? form.workType.replaceAll("_", " ") : ""} placeholder="Select an approved authority first" readOnly required style={readOnlyStyle} />
              </div>
              <div className={styles.formGroup}>
                <label>Date Worked (from approved authority)</label>
                <input type="date" value={form.dateWorked} readOnly required style={readOnlyStyle} />
              </div>
              <div className={styles.formGroup}>
                <label>COC Hours to Credit (auto-computed)</label>
                <input type="number" value={form.hoursWorked} readOnly required style={readOnlyStyle} />
              </div>
              <div className={styles.formGroup}>
                <label>Purpose / Justification (from approved authority)</label>
                <textarea value={form.reason} placeholder="Select an approved authority first" rows={3} readOnly required style={readOnlyStyle} />
              </div>

              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting || isPreviewing || !preview} className={styles.submitBtn}>
                  {isSubmitting ? "Submitting…" : "File COC"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("table");
                  }}
                  className={styles.clearBtn}
                >
                  Cancel
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
const balanceBannerStyle: React.CSSProperties = { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "0.5rem 0.875rem", marginBottom: "0.75rem", display: "inline-block" };
const tabBarStyle: React.CSSProperties = { display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" };
const tabStyle = (active: boolean): React.CSSProperties => ({ background: "none", border: "none", cursor: "pointer", fontWeight: active ? 700 : 400, color: active ? "#1d4ed8" : "#374151", borderBottom: active ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" });
const searchStyle: React.CSSProperties = { border: "1px solid #ccc", borderRadius: 4, padding: "5px 10px", fontSize: "13px", minWidth: "180px" };
const readOnlyStyle: React.CSSProperties = { background: "#f3f4f6", cursor: "not-allowed" };
const previewStyle: React.CSSProperties = { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "0.7rem 0.85rem", color: "#1e3a5f", fontSize: "0.86rem", lineHeight: 1.45 };
const hintStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.8rem" };
const hintErrorStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "#dc2626", fontSize: "0.8rem" };
const deleteBtnStyle: React.CSSProperties = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 5, padding: "0.3rem 0.6rem", cursor: "pointer", marginRight: "0.35rem", fontSize: "0.8rem" };
const printBtnStyle: React.CSSProperties = { background: "#4b5563", color: "#fff", border: "none", borderRadius: 5, padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.8rem" };
