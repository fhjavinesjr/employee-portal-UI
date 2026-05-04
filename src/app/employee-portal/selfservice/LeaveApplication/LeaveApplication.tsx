"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import LeaveApplicationTable from "@/components/tables/leaveapplicationTable";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

// ── Leave Type Registry ─────────────────────────────────────────────────────
// Single source of truth. Update strings here and every switch/label/list
// updates automatically.
const LEAVE_TYPES = {
  VACATION:          "Vacation Leave",
  SICK:              "Sick Leave",
  FORCED:            "Forced Leave",
  SPECIAL_PRIVILEGE: "Special Privilege Leave",
  STUDY:             "Study Leave",
  TERMINAL:          "Terminal Leave",
  PATERNITY:         "Paternity Leave",
  MATERNITY:         "Maternity Leave",
  SOLO_PARENT:       "Solo Parent Leave",
  ADOPTION:          "Adoption Leave",
  REHABILITATION:    "Rehabilitation Leave",
  GYNECOLOGICAL:     "Gynecological Leave",
  COVID19:           "COVID-19 Treatment Leave",
  VAWC:              "10-Day VAWC Leave",
  SPECIAL_EMERGENCY: "Special Emergency Leave",
} as const;


// ── CSC Leave Validation Helpers ──────────────────────────────────────────────

/** Count Mon–Fri working days between two dates (both inclusive). */
function countWorkingDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d <= e) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Count working days strictly after `filed` and up to and including `start`.
 * Used to validate advance-filing requirements.
 */
function workingDaysAdvance(filed: Date, start: Date): number {
  const next = new Date(filed);
  next.setDate(next.getDate() + 1);
  return countWorkingDays(next, start);
}

/** Calendar days from filed to start (filed is day 0). */
function calendarDaysAdvance(filed: Date, start: Date): number {
  const f = new Date(filed); f.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  return Math.round((s.getTime() - f.getTime()) / 86_400_000);
}

interface ValidationResult {
  /** Blocking — prevents submission. */
  errors: string[];
  /** Non-blocking — user can override with confirmation. */
  warnings: string[];
  /** Informational only — shown inline in form. */
  notices: string[];
}

function computeValidation(
  leaveType: string,
  dateFiled: string,
  from: string,
  to: string,
  balance: LeaveBalanceDTO | null,
): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [], notices: [] };
  if (!leaveType || !dateFiled || !from) return result;

  const filed = new Date(dateFiled);
  const start = new Date(from);
  const end   = to ? new Date(to) : new Date(from);

  // Guard: from must not be after to
  if (to && end < start) {
    result.errors.push("The end date cannot be earlier than the start date.");
    return result;
  }

  const duration = countWorkingDays(start, end); // working days of the leave
  const advanceWorkingDays = workingDaysAdvance(filed, start);
  const advanceCalendarDays = calendarDaysAdvance(filed, start);

  switch (leaveType) {

    case LEAVE_TYPES.VACATION: {
      // CSC Rule: Must be filed at least 5 working days in advance.
      if (advanceWorkingDays < 5) {
        result.errors.push(
          `Vacation Leave must be filed at least 5 working days before the start date. ` +
          `You currently have ${advanceWorkingDays} working day(s) of advance notice.`
        );
      }
      break;
    }

    case LEAVE_TYPES.SICK: {
      // CSC Rule: Filed retroactively upon return — cannot be in advance.
      if (start > filed) {
        result.errors.push(
          "Sick Leave must be filed upon return to work. " +
          "The leave start date cannot be a future date."
        );
      }
      // CSC Rule: Medical certificate required for absences exceeding 5 consecutive days.
      if (duration > 5) {
        result.warnings.push(
          "Sick Leave exceeding 5 consecutive days requires a medical certificate upon return to work (CSC Omnibus Rules on Leave)."
        );
      }
      break;
    }

    case LEAVE_TYPES.FORCED: {
      // CSC Rule: Must be scheduled/filed in advance.
      if (start <= filed) {
        result.errors.push(
          "Forced Leave must be scheduled and filed before the start date (advance filing required)."
        );
      }
      // CSC Rule: Mandatory 5 days per calendar year; excess is not allowed.
      if (balance?.forcedLeaveBalance !== null && duration > (balance?.forcedLeaveBalance ?? 0)) {
        result.errors.push(
          `Forced Leave is limited to 5 days per calendar year. ` +
          `Your remaining Forced Leave balance is ${balance?.forcedLeaveBalance ?? 0} day(s).`
        );
      }
      // CSC Rule: Concurrent VL deduction — FL consumes both FL and VL credits.
      result.notices.push(
        "Per CSC rules, Forced Leave is charged concurrently against your Vacation Leave credits. " +
        "Both your Forced Leave and Vacation Leave balances will be reduced."
      );
      break;
    }

    case LEAVE_TYPES.SPECIAL_PRIVILEGE: {
      // CSC Rule: Filed at least 3 calendar days in advance.
      if (advanceCalendarDays < 3) {
        result.errors.push(
          `Special Privilege Leave must be filed at least 3 calendar days before the start date. ` +
          `You currently have ${advanceCalendarDays} calendar day(s) of advance notice.`
        );
      }
      // CSC Rule: Maximum 3 days per calendar year, non-cumulative.
      if (balance?.splBalance !== null && duration > (balance?.splBalance ?? 0)) {
        result.errors.push(
          `Special Privilege Leave is limited to 3 days per calendar year. ` +
          `Your remaining SPL balance is ${balance?.splBalance ?? 0} day(s).`
        );
      }
      result.notices.push(
        "Special Privilege Leave is non-cumulative. Unused SPL days at year-end are forfeited."
      );
      break;
    }

    case LEAVE_TYPES.PATERNITY: {
      result.notices.push(
        "Paternity Leave (7 working days, RA 8187) must be filed within 60 days of the date of delivery."
      );
      break;
    }

    case LEAVE_TYPES.MATERNITY: {
      result.notices.push(
        "Expanded Maternity Leave covers 105 working days with full pay (RA 11210). " +
        "File before confinement when possible."
      );
      break;
    }

    case LEAVE_TYPES.SOLO_PARENT: {
      result.notices.push(
        "Solo Parent Leave (7 days/year, RA 8972) requires a valid Solo Parent Identification Card."
      );
      break;
    }

    case LEAVE_TYPES.STUDY: {
      result.notices.push(
        "Study Leave requires prior approval from the head of agency and supporting enrollment documents."
      );
      break;
    }

    case LEAVE_TYPES.REHABILITATION: {
      result.notices.push(
        "Rehabilitation Leave requires a medical certificate confirming the injury was sustained in the performance of duties."
      );
      break;
    }

    case LEAVE_TYPES.GYNECOLOGICAL: {
      result.notices.push(
        "Gynecological Leave (up to 2 months/year) requires a medical certificate. " +
        "It is charged first against Sick Leave credits, then Vacation Leave."
      );
      break;
    }

    case LEAVE_TYPES.VAWC: {
      result.notices.push(
        "VAWC Leave (10 days/year, RA 9262) is non-cumulative and non-commutable. " +
        "A Barangay Protection Order or relevant documentation may be required."
      );
      break;
    }

    case LEAVE_TYPES.TERMINAL: {
      result.notices.push(
        "Terminal Leave represents the commutation of all unused leave credits upon separation or retirement. " +
        "This requires HR processing and approval."
      );
      break;
    }
  }

  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaveBalanceDTO {
  employeeId: number;
  vacationLeaveBalance: number | null;
  sickLeaveBalance: number | null;
  splBalance: number | null;
  forcedLeaveBalance: number | null;
  lastProcessedPeriodEnd: string | null;
}

interface ApiLeaveApplicationDTO {
  leaveApplicationId: number;
  employeeId: number;
  dateFiled: string | null;
  leaveType: string;
  startDate: string | null;
  endDate: string | null;
  noOfDays: number | null;
  commutation: string | null;
  details: string | null;
  status: string;
  recommendationStatus: string | null;
  recommendationMessage: string | null;
  approvedStatus: string | null;
  approvalMessage: string | null;
}

interface TableLeaveData {
  id: number;
  dateFiled: string;
  from: string;
  to: string;
  leaveType: string;
  commutation: string;
  details: string;
  status: string;
  approvedStatus: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined): string =>
  v == null ? "—" : v.toFixed(3);

/** Which balance label to show for the selected leave type */
function balanceLabelFor(leaveType: string): { label: string; key: keyof LeaveBalanceDTO } | null {
  switch (leaveType) {
    case LEAVE_TYPES.VACATION:
    case LEAVE_TYPES.FORCED:
      return { label: "VL Available", key: "vacationLeaveBalance" };
    case LEAVE_TYPES.SICK:
      return { label: "SL Available", key: "sickLeaveBalance" };
    case LEAVE_TYPES.SPECIAL_PRIVILEGE:
      return { label: "SPL Available", key: "splBalance" };
    default:
      return null;
  }
}

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeaveApplication() {
  const today = new Date().toISOString().split("T")[0];

  const initialFormState = {
    dateFiled: today,
    leaveType: "",
    from: "",
    to: "",
    commutation: "requested",
    details: "",
    noOfDays: "",
  };

  const [form, setForm] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<TableLeaveData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState<LeaveBalanceDTO | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const leaveTypes = Object.values(LEAVE_TYPES);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (empId: number) => {
    setIsBalanceLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/leave-balance/current/${empId}`);
      if (!res.ok) throw new Error("Failed to fetch balance");
      setBalance(await res.json());
    } catch {
      // Non-fatal — form still works without balance
      setBalance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  }, []);

  const fetchRecords = useCallback(async (empId: number) => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/leave-application/get-all/${empId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ApiLeaveApplicationDTO[] = await res.json();
      setRecords(
        data
          .filter((d) => d.leaveType !== "Leave Monetization")
          .map((d) => ({
            id: d.leaveApplicationId,
            dateFiled: d.dateFiled ?? "",
            from: d.startDate ?? "",
            to: d.endDate ?? "",
            leaveType: d.leaveType,
            commutation: d.commutation ?? "",
            details: d.details ?? "",
            status: d.status,
            approvedStatus: d.approvedStatus ?? null,
          }))
      );
    } catch {
      Toast.fire({ icon: "error", title: "Could not load leave records" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    fetchRecords(empId);
    fetchBalance(empId);
  }, [fetchRecords, fetchBalance]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Live CSC validation (derived — no state needed) ───────────────────────

  const validation = useMemo(
    () => computeValidation(form.leaveType, form.dateFiled, form.from, form.to, balance),
    [form.leaveType, form.dateFiled, form.from, form.to, balance],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) {
      Swal.fire("Error", "Session expired. Please log in again.", "error");
      return;
    }

    // ── Block on hard CSC rule errors ──────────────────────────────────────
    if (validation.errors.length > 0) {
      await Swal.fire({
        title: "Cannot Submit Leave Application",
        html: `<ul style="text-align:left;margin:0;padding-left:1.2rem;">${validation.errors
          .map((e) => `<li style="margin-bottom:0.5rem;">${e}</li>`)
          .join("")}</ul>`,
        icon: "error",
        confirmButtonText: "Understood",
      });
      return;
    }

    // ── Confirm if there are CSC warnings (e.g. medical cert, LWOP risk) ──
    if (validation.warnings.length > 0) {
      const proceed = await Swal.fire({
        title: "Please Note",
        html: `<ul style="text-align:left;margin:0;padding-left:1.2rem;">${validation.warnings
          .map((w) => `<li style="margin-bottom:0.5rem;">${w}</li>`)
          .join("")}</ul><br/>Do you want to proceed?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, proceed",
        cancelButtonText: "Cancel",
      });
      if (!proceed.isConfirmed) return;
    }

    // ── Warn if balance is zero/negative ───────────────────────────────────
    const balInfo = balanceLabelFor(form.leaveType);
    if (balInfo && balance) {
      const available = balance[balInfo.key] as number | null;
      if (available !== null && available <= 0) {
        const proceed = await Swal.fire({
          title: "Insufficient Balance",
          text: `Your estimated ${balInfo.label} is ${fmt(available)} day(s). Proceeding will likely result in Leave Without Pay (LWOP). Continue anyway?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, file anyway",
          cancelButtonText: "Cancel",
        });
        if (!proceed.isConfirmed) return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: empId,
        dateFiled: form.dateFiled,
        leaveType: form.leaveType,
        startDate: form.from || null,
        endDate: form.to || null,
        noOfDays: null,
        commutation: form.commutation || null,
        details: form.details || null,
        status: "Pending",
      };

      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/leave-application/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      Toast.fire({ icon: "success", title: "Leave application submitted!" });
      setForm(initialFormState);
      setActiveTab("table");
      await fetchRecords(empId);
      await fetchBalance(empId);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Failed to submit.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setForm(initialFormState);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const balInfo = balanceLabelFor(form.leaveType);
  const displayBalance = balInfo && balance ? (balance[balInfo.key] as number | null) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div id="leaveapplicationModal" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Leave Application</h2>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "1rem", padding: "0 1.5rem", borderBottom: "2px solid #e5e7eb", marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            style={{
              padding: "0.6rem 1.2rem",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "none",
              borderBottom: activeTab === "table" ? "3px solid #2f4da1" : "3px solid transparent",
              background: "none",
              color: activeTab === "table" ? "#2f4da1" : "#6b7280",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            My Leaves
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("apply")}
            style={{
              padding: "0.6rem 1.2rem",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "none",
              borderBottom: activeTab === "apply" ? "3px solid #2f4da1" : "3px solid transparent",
              background: "none",
              color: activeTab === "apply" ? "#2f4da1" : "#6b7280",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            + File Leave
          </button>
        </div>

        {/* ── My Leaves tab ── */}
        {activeTab === "table" && (
          <div className={modalStyles.modalBody}>
            {isLoading ? (
              <p style={{ color: "#6b7280", padding: "1rem 0" }}>Loading records…</p>
            ) : records.length === 0 ? (
              <p style={{ color: "#6b7280", padding: "1rem 0" }}>No leave applications found.</p>
            ) : (
              <LeaveApplicationTable data={records} />
            )}
          </div>
        )}

        {/* ── File Leave tab ── */}
        {activeTab === "apply" && (
          <form className={modalStyles.modalBody} onSubmit={handleSubmit}>

            {/* Date Filed */}
            <div className={styles.formGroup}>
              <label className={styles.labelDateFiled}>Date Filed</label>
              <input
                className={`${styles.inputBase} ${styles.dateFiledInput}`}
                type="date"
                name="dateFiled"
                value={form.dateFiled}
                onChange={handleChange}
                required
              />
            </div>

            {/* Leave Type */}
            <div className={styles.formGroup}>
              <label className={styles.labelLeaveType}>Leave Type</label>
              <select
                className={styles.selectBase}
                name="leaveType"
                value={form.leaveType}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select</option>
                {leaveTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Balance indicator — shown for VL, SL, SPL, Forced Leave */}
            {balInfo && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: displayBalance !== null && displayBalance <= 0 ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${displayBalance !== null && displayBalance <= 0 ? "#fca5a5" : "#86efac"}`,
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                marginBottom: "1.25rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: displayBalance !== null && displayBalance <= 0 ? "#dc2626" : "#15803d",
              }}>
                <span>{balInfo.label}:</span>
                <span>
                  {isBalanceLoading
                    ? "Loading…"
                    : displayBalance !== null
                      ? `${fmt(displayBalance)} day(s)`
                      : "—"}
                </span>
                {balance?.lastProcessedPeriodEnd && (
                  <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "#6b7280", marginLeft: "0.5rem" }}>
                    (as of period ending {balance.lastProcessedPeriodEnd})
                  </span>
                )}
              </div>
            )}

            {/* CSC informational notices (shown as soon as leave type is selected) */}
            {validation.notices.map((notice, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "0.6rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.84rem",
                color: "#1d4ed8",
                lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>ℹ</span>
                <span>{notice}</span>
              </div>
            ))}

            {/* Inclusive Dates */}
            <div className={styles.formGroup}>
              <label className={styles.labelInclusiveDate}>Inclusive Date</label>
              <label>From:</label>
              <div className={styles.dateRange}>
                <input
                  className={styles.inputBase}
                  type="date"
                  name="from"
                  value={form.from}
                  onChange={handleChange}
                  required
                />
                <label>To:</label>
                <input
                  className={styles.inputBase}
                  type="date"
                  name="to"
                  value={form.to}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* CSC validation errors — shown live once dates are entered */}
            {form.from && validation.errors.map((err, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                padding: "0.6rem 1rem",
                marginBottom: "0.75rem",
                fontSize: "0.84rem",
                color: "#dc2626",
                lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>✕</span>
                <span>{err}</span>
              </div>
            ))}

            {/* CSC warnings — shown live once dates are entered */}
            {form.from && validation.warnings.map((warn, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: "8px",
                padding: "0.6rem 1rem",
                marginBottom: "0.75rem",
                fontSize: "0.84rem",
                color: "#92400e",
                lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>⚠</span>
                <span>{warn}</span>
              </div>
            ))}

            {/* Commutation */}
            <div className={styles.formGroup}>
              <label className={styles.labelCommutation}>Commutation</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    name="commutation"
                    value="requested"
                    checked={form.commutation === "requested"}
                    onChange={handleChange}
                    required
                  />
                  Requested
                </label>
                <label>
                  <input
                    type="radio"
                    name="commutation"
                    value="notRequested"
                    checked={form.commutation === "notRequested"}
                    onChange={handleChange}
                    required
                  />
                  Not Requested
                </label>
              </div>
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

            {/* Buttons */}
            <div className={styles.buttonGroup}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || (form.from !== "" && validation.errors.length > 0)}
                title={validation.errors.length > 0 ? validation.errors[0] : undefined}
              >
                {isSubmitting ? "Submitting…" : "Submit"}
              </button>
              <button type="button" onClick={handleClear} className={styles.clearBtn}>
                Clear
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
