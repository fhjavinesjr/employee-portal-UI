"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_HRM = runtimeConfig.getApiUrl("hrm");
const API_ADMIN = runtimeConfig.getApiUrl("administrative");

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "Pending" | "Approved" | "Disapproved";
type RecStatusFilter = "All" | "Not Recommended" | "Recommended" | "Disapproved";
type FilterMode = "date" | "name";

interface RequestConfig {
  label: string;
  endpoint: string;
  idField: string;
  dateField: string;
  statusField: string;
  approveUrl: (id: number) => string;
  disapproveUrl: (id: number) => string;
  recommendUrl?: (id: number) => string;
  /** If true, approve/disapprove/recommend sends the full updated DTO instead of {approvedById, remarks} */
  useUpdateForAction?: boolean;
  /** Optional extra predicate to filter records within a shared endpoint (e.g. by officialType) */
  recordFilter?: (r: Record<string, unknown>) => boolean;
  getSummary: (r: Record<string, unknown>) => string;
}

interface RequestRow {
  id: number;
  employeeId: number;
  employeeName: string;
  dateFiled: string;
  status: string;
  summary: string;
  typeKey: string;
  raw: Record<string, unknown>;
}

interface WorkflowRow {
  approvalWorkflowId: number;
  approvalLevel: number;
  employeeId: number;
  employeeName: string;
  personnelStatus: string;
}

interface PersonnelEntry {
  employeeId: number;
  businessUnitId: number;
  base: string;
  head: boolean;
  coApprover: boolean;
}

// ─── Request Type Config (keyed by lowercase Employee Request name from DB) ───

const REQUEST_CONFIGS: Record<string, RequestConfig> = {
  "leave application": {
    label: "Leave Application",
    endpoint: `${API_HRM}/api/leave-application/get-all`,
    idField: "leaveApplicationId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/leave-application/update/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/leave-application/update/${id}`,
    useUpdateForAction: true,
    getSummary: (r) =>
      `${r.leaveType ?? ""} | ${r.startDate ?? ""} → ${r.endDate ?? ""} | ${r.noOfDays ?? 0} days`,
  },
  "leave monetization": {
    label: "Leave Monetization",
    endpoint: `${API_HRM}/api/leave-monetization/get-all`,
    idField: "leaveMonetizationId",
    dateField: "dateFiled",
    statusField: "approvalStatus",
    approveUrl: (id) => `${API_HRM}/api/leave-monetization/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/leave-monetization/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/leave-monetization/recommend/${id}`,
    getSummary: (r) =>
      `SL: ${r.noOfDaysSL ?? 0} days | VL: ${r.noOfDaysVL ?? 0} days`,
  },
  "overtime request": {
    label: "Overtime Request",
    endpoint: `${API_HRM}/api/overtime-request/get-all`,
    idField: "overtimeRequestId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/overtime-request/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/overtime-request/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/overtime-request/recommend/${id}`,
    getSummary: (r) =>
      `${r.dateTimeFrom ?? ""} – ${r.dateTimeTo ?? ""} | ${r.totalHours ?? 0}h | ${r.purpose ?? ""}`,
  },
  "compensatory overtime credit": {
    label: "Compensatory Overtime Credit",
    endpoint: `${API_HRM}/api/coc/get-all`,
    idField: "cocId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/coc/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/coc/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/coc/recommend/${id}`,
    getSummary: (r) =>
      `Date Worked: ${r.dateWorked ?? ""} | ${r.hoursWorked ?? 0}h | ${r.reason ?? ""}`,
  },
  "compensatory time off": {
    label: "Compensatory Time Off",
    endpoint: `${API_HRM}/api/cto/get-all`,
    idField: "ctoId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/cto/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/cto/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/cto/recommend/${id}`,
    getSummary: (r) =>
      `Date of Offset: ${r.dateOfOffset ?? ""} | ${r.hoursUsed ?? 0}h`,
  },
  "official business": {
    label: "Official Business",
    endpoint: `${API_HRM}/api/official-engagement/get-all`,
    idField: "officialEngagementApplicationId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/official-engagement/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/official-engagement/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/official-engagement/recommend/${id}`,
    recordFilter: (r) => String(r.officialType ?? "").toLowerCase() === "official business",
    getSummary: (r) =>
      `Official Business | ${r.startDate ?? ""} to ${r.endDate ?? ""}`,
  },
  "official time": {
    label: "Official Time",
    endpoint: `${API_HRM}/api/official-engagement/get-all`,
    idField: "officialEngagementApplicationId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/official-engagement/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/official-engagement/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/official-engagement/recommend/${id}`,
    recordFilter: (r) => String(r.officialType ?? "").toLowerCase() === "official time",
    getSummary: (r) =>
      `Official Time | ${r.startDate ?? ""} to ${r.endDate ?? ""}`,
  },
  "pass slip": {
    label: "Pass Slip",
    endpoint: `${API_HRM}/api/pass-slip/get-all`,
    idField: "passSlipId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/pass-slip/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/pass-slip/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/pass-slip/recommend/${id}`,
    getSummary: (r) =>
      `${r.passSlipDate ?? ""} | ${r.purpose ?? ""}`,
  },
  "time correction": {
    label: "Time Correction",
    endpoint: `${API_HRM}/api/time-correction/get-all`,
    idField: "timeCorrectionId",
    dateField: "dateFiled",
    statusField: "status",
    approveUrl: (id) => `${API_HRM}/api/time-correction/approve/${id}`,
    disapproveUrl: (id) => `${API_HRM}/api/time-correction/disapprove/${id}`,
    recommendUrl: (id) => `${API_HRM}/api/time-correction/recommend/${id}`,
    getSummary: (r) =>
      `Work Date: ${r.workDate ?? ""} | ${r.correctedTimeIn ?? ""} – ${r.correctedTimeOut ?? ""}`,
  },
};

/**
 * Flexible config lookup: tries exact key, then strips/adds trailing "s".
 * Handles DB name mismatches like "Compensatory Overtime Credits" vs
 * the config key "compensatory overtime credit".
 */
function getConfig(type: string): RequestConfig | undefined {
  return (
    REQUEST_CONFIGS[type] ??
    REQUEST_CONFIGS[type.replace(/s$/i, "")] ??
    REQUEST_CONFIGS[type + "s"]
  );
}

// ─── Inline styles ───────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
  fontSize: 13,
};

const approveBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  backgroundColor: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const disapproveBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  backgroundColor: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const recommendBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  backgroundColor: "#d97706",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
};

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApprovalRequestPage() {
  const loggedInId = localStorageUtil.getEmployeeId();

  /** null = still loading */
  const [isApprover, setIsApprover] = useState<boolean | null>(null);
  const [myBusinessUnits, setMyBusinessUnits] = useState<Array<{ id: number; name: string }>>([]);
  const [businessUnitId, setBusinessUnitId] = useState<number | null>(null);
  const [businessUnitName, setBusinessUnitName] = useState<string>("");
  const [buEmployeeIds, setBuEmployeeIds] = useState<Set<number>>(new Set());
  const [employeeNameMap, setEmployeeNameMap] = useState<Map<number, string>>(new Map());
  const [employeeNoMap, setEmployeeNoMap] = useState<Map<number, string>>(new Map());

  // Full personnel list for Head/Co-Approver status lookup in workflow
  const [allPersonnel, setAllPersonnel] = useState<PersonnelEntry[]>([]);
  // Full workflow list for per-record level lookup in "All BU" mode
  const [allWorkflowsRaw, setAllWorkflowsRaw] = useState<Array<{ approvalWorkflowId: number; employeeId: number; businessUnitId: number; employeeRequestId: number; approvalLevel: number }>>([]);
  // "All Business Units" mode
  const [isAllBu, setIsAllBu] = useState(false);
  // Union of employee IDs across ALL approver BUs (used when isAllBu)
  const [allBuEmployeeIds, setAllBuEmployeeIds] = useState<Set<number>>(new Set());
  // Co-approver mode: logged-in user is a co-approver acting on behalf of a principal
  const [isCoApproving, setIsCoApproving] = useState(false);
  // The principal approver employee IDs whose workflows are inherited by this co-approver
  const [coApprovedForIds, setCoApprovedForIds] = useState<number[]>([]);
  // name (lowercase) → employeeRequestId
  const [employeeRequestMap, setEmployeeRequestMap] = useState<Map<string, number>>(new Map());
  // original-cased list from DB for dropdown
  const [employeeRequestList, setEmployeeRequestList] = useState<Array<{ name: string; employeeRequestId: number }>>([]);
  // Approval workflow rows for the selected request type
  const [workflowRows, setWorkflowRows] = useState<WorkflowRow[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [currentRequestName, setCurrentRequestName] = useState<string>("");

  // Filters
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("Pending");
  const [recStatusFilter, setRecStatusFilter] = useState<RecStatusFilter>("All");
  const [filterMode, setFilterMode] = useState<FilterMode>("date");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [nameFilter, setNameFilter] = useState<string>("");

  // Results
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Clear results whenever key filters change so stale rows are never shown
  useEffect(() => { setRows([]); }, [selectedType, selectedStatus, recStatusFilter]);

  // ── On mount: resolve approver info ─────────────────────────────────────

  useEffect(() => {
    if (!loggedInId) {
      setIsApprover(false);
      return;
    }

    // Build employee name/no maps from localStorage (populated on login)
    const allEmployees = localStorageUtil.getEmployees();
    const nameMap = new Map<number, string>();
    const noMap = new Map<number, string>();
    allEmployees.forEach((e) => {
      nameMap.set(e.employeeId, e.fullName);
      noMap.set(e.employeeId, e.employeeNo);
    });
    setEmployeeNameMap(nameMap);
    setEmployeeNoMap(noMap);

    Promise.all([
      fetchWithAuth(`${API_ADMIN}/api/approval-workflow/get-all`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/manage-personnel/get-all`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/businessUnits/get-all`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/employeeRequest/get-all`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(
      ([
        allWorkflows,
        personnel,
        businessUnits,
        employeeRequests,
      ]: [
        Array<{ approvalWorkflowId: number; employeeId: number; businessUnitId: number; employeeRequestId: number; approvalLevel: number }>,
        Array<{ employeeId: number; businessUnitId: number; base: string; head: boolean; coApprover: boolean }>,
        Array<{ businessUnitsId: number; businessUnitsName: string }>,
        Array<{ employeeRequestId: number; name: string }>,
      ]) => {
        // Build employeeRequest name→id map
        const reqMap = new Map<string, number>();
        employeeRequests.forEach((er) => {
          reqMap.set(er.name.toLowerCase(), er.employeeRequestId);
        });
        setEmployeeRequestMap(reqMap);
        setEmployeeRequestList(
          employeeRequests.map((er) => ({ name: er.name, employeeRequestId: er.employeeRequestId })),
        );
        setSelectedType(employeeRequests[0]?.name.toLowerCase() ?? "");

        // Store full personnel list for Head/Co-Approver resolution
        setAllPersonnel(
          personnel.map((p) => ({
            employeeId: p.employeeId,
            businessUnitId: p.businessUnitId,
            base: p.base,
            head: p.head,
            coApprover: p.coApprover,
          })),
        );

        // Store raw workflows for per-record level lookup in "All BU" mode
        setAllWorkflowsRaw(allWorkflows);

        // Determine approver status: employee must appear in the approval workflow table
        let myWorkflows = allWorkflows.filter(
          (wf) => String(wf.employeeId) === String(loggedInId),
        );

        // ── Co-Approver fallback ──────────────────────────────────────────────
        // If the logged-in user is NOT a direct approver, check if they are a
        // co-approver in their base BU. If so, inherit the Head(s)' workflows.
        let resolvedCoApproving = false;
        let resolvedCoApprovedForIds: number[] = [];

        if (myWorkflows.length === 0) {
          // Find this user's base BU (base=Yes) in ManagePersonnel
          const myBaseEntry = personnel.find(
            (p) => String(p.employeeId) === String(loggedInId) && String(p.base).toLowerCase() === "yes",
          );

          if (myBaseEntry?.coApprover) {
            // Find the Head(s) of the same base BU
            const principalIds = personnel
              .filter(
                (p) => p.businessUnitId === myBaseEntry.businessUnitId && p.head === true,
              )
              .map((p) => Number(p.employeeId));

            // Collect all workflow entries belonging to those principal(s)
            const inheritedWorkflows = allWorkflows.filter((wf) =>
              principalIds.map(String).includes(String(wf.employeeId)),
            );

            if (inheritedWorkflows.length > 0) {
              myWorkflows = inheritedWorkflows;
              resolvedCoApproving = true;
              resolvedCoApprovedForIds = principalIds;
            }
          }

          if (!resolvedCoApproving) {
            setIsApprover(false);
            return;
          }
        }

        setIsCoApproving(resolvedCoApproving);
        setCoApprovedForIds(resolvedCoApprovedForIds);

        // Collect ALL unique business units from the effective workflows
        const uniqueBuIds = [...new Set(myWorkflows.map((wf) => wf.businessUnitId))];
        const myBUs = uniqueBuIds.map((id) => {
          const bu = businessUnits.find((u) => u.businessUnitsId === id);
          return { id, name: bu?.businessUnitsName ?? `BU #${id}` };
        });
        setMyBusinessUnits(myBUs);
        setIsApprover(true);

        // Default to the first BU
        const myBuId = uniqueBuIds[0];
        setBusinessUnitId(myBuId);
        setBusinessUnitName(myBUs[0]?.name ?? "");

        // Collect employee IDs whose BASE=Yes is in the default business unit
        const ids = new Set<number>(
          personnel
            .filter((p) => p.businessUnitId === myBuId && String(p.base).toLowerCase() === "yes")
            .map((p) => Number(p.employeeId)),
        );
        setBuEmployeeIds(ids);

        // Pre-compute union of employee IDs whose BASE=Yes is in any of the approver's BUs (for "All" mode)
        const allBuEmpIds = new Set<number>(
          personnel
            .filter((p) => uniqueBuIds.includes(p.businessUnitId) && String(p.base).toLowerCase() === "yes")
            .map((p) => Number(p.employeeId)),
        );
        setAllBuEmployeeIds(allBuEmpIds);
      },
    ).catch(() => setIsApprover(false));
  }, [loggedInId]);

  // ── Switch business unit ─────────────────────────────────────────────────

  const handleBuChange = useCallback((newBuId: number) => {
    setIsAllBu(false);
    setBusinessUnitId(newBuId);
    const bu = myBusinessUnits.find((b) => b.id === newBuId);
    setBusinessUnitName(bu?.name ?? "");
    // Only employees whose BASE=Yes is in this BU are routed here
    const ids = new Set<number>(
      allPersonnel
        .filter((p) => p.businessUnitId === newBuId && String(p.base).toLowerCase() === "yes")
        .map((p) => Number(p.employeeId)),
    );
    setBuEmployeeIds(ids);
    setRows([]);
  }, [myBusinessUnits, allPersonnel]);

  // ── Fetch Approval Workflow whenever type / businessUnit changes ──────────

  useEffect(() => {
    if (!selectedType || employeeRequestMap.size === 0) return;
    if (isAllBu) {
      // In "All BU" mode there is no single workflow to display
      setWorkflowRows([]);
      setCurrentRequestName(getConfig(selectedType)?.label ?? selectedType);
      return;
    }
    if (!businessUnitId) return;

    const employeeRequestId = employeeRequestMap.get(selectedType);

    if (!employeeRequestId) {
      setWorkflowRows([]);
      setCurrentRequestName("");
      return;
    }

    const displayEntry = employeeRequestList.find(
      (er) => er.employeeRequestId === employeeRequestId,
    );
    setCurrentRequestName(displayEntry?.name ?? selectedType);

    setWorkflowLoading(true);
    fetchWithAuth(
      `${API_ADMIN}/api/approval-workflow/get-by-unit-and-request?businessUnitId=${businessUnitId}&employeeRequestId=${employeeRequestId}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (data: Array<{ approvalWorkflowId: number; employeeId: number; approvalLevel: number }>) => {
          const sorted = [...data].sort((a, b) => a.approvalLevel - b.approvalLevel);
          setWorkflowRows(
            sorted.map((wf) => {
              const p = allPersonnel.find(
                (pp) => Number(pp.employeeId) === Number(wf.employeeId),
              );
              const personnelStatus = p?.head
                ? "Head"
                : p?.coApprover
                  ? "Co-Approver"
                  : "Rank and File";
              return {
                approvalWorkflowId: wf.approvalWorkflowId,
                approvalLevel: wf.approvalLevel,
                employeeId: wf.employeeId,
                employeeName:
                  employeeNameMap.get(Number(wf.employeeId)) ??
                  `Employee #${wf.employeeId}`,
                personnelStatus,
              };
            }),
          );
        },
      )
      .catch(() => setWorkflowRows([]))
      .finally(() => setWorkflowLoading(false));
  }, [isAllBu, businessUnitId, selectedType, employeeRequestMap, employeeRequestList, allPersonnel, employeeNameMap]);

  // ── Compute current user's approval level for selected request type ─────────

  const myApprovalLevel = isAllBu
    ? null
    : (() => {
        if (isCoApproving) {
          // Co-approver: find the level from any of the principal IDs in the workflow
          const principalRow = workflowRows.find((wf) =>
            coApprovedForIds.map(String).includes(String(wf.employeeId)),
          );
          return principalRow?.approvalLevel ?? null;
        }
        return (
          workflowRows.find((wf) => String(wf.employeeId) === String(loggedInId))
            ?.approvalLevel ?? null
        );
      })();

  // ── Load records ─────────────────────────────────────────────────────────

  const handleLoad = useCallback(async () => {
    const effectiveIds = isAllBu ? allBuEmployeeIds : buEmployeeIds;
    if (!isAllBu && !businessUnitId) return;
    if (effectiveIds.size === 0) return;
    const config = getConfig(selectedType);
    if (!config) return;
    setIsLoading(true);
    setRows([]);

    try {
      const res = await fetchWithAuth(config.endpoint);
      if (!res.ok) throw new Error("Fetch failed");

      const data: Record<string, unknown>[] = await res.json();

      const filtered = data.filter((r) => {
        const empId = Number(r.employeeId);
        if (!effectiveIds.has(empId)) return false;
        // Exclude the logged-in approver's own requests
        if (empId === Number(loggedInId)) return false;
        // Exclude the principal(s) the co-approver is acting on behalf of
        if (isCoApproving && coApprovedForIds.map(Number).includes(empId)) return false;
        // Type-specific record filter (e.g. official business vs official time)
        if (config.recordFilter && !config.recordFilter(r)) return false;

        const rowStatus = String(r[config.statusField] ?? "");
        if (rowStatus !== selectedStatus) return false;

        // Recommendation Status filter
        if (recStatusFilter !== "All") {
          const recStatus = String(r.recommendationStatus ?? "");
          if (recStatusFilter === "Not Recommended") {
            if (recStatus !== "") return false;
          } else if (recStatusFilter === "Recommended") {
            // Covers both "Recommended" and "Approved" (LeaveMonetization quirk)
            if (recStatus !== "Recommended" && recStatus !== "Approved") return false;
          } else if (recStatusFilter === "Disapproved") {
            if (recStatus !== "Disapproved") return false;
          }
        }

        // Level-based recommendationStatus filter (only applies to Pending view)
        if (selectedStatus === "Pending") {
          const recStatus = String(r.recommendationStatus ?? "");
          let levelForRecord = myApprovalLevel;
          if (isAllBu) {
            // Use the base=Yes entry to find the correct routing BU for this employee
            const pEntry = allPersonnel.find((pp) => Number(pp.employeeId) === empId && String(pp.base).toLowerCase() === "yes");
            if (pEntry) {
              const reqId = employeeRequestMap.get(selectedType);
              // Match by effective approver IDs (principal's for co-approver, own for direct approver)
              const effectiveApproverIds = isCoApproving
                ? coApprovedForIds.map(String)
                : [String(loggedInId)];
              const wf = allWorkflowsRaw.find(
                (w) =>
                  w.businessUnitId === pEntry.businessUnitId &&
                  w.employeeRequestId === reqId &&
                  effectiveApproverIds.includes(String(w.employeeId)),
              );
              levelForRecord = wf?.approvalLevel ?? null;
            } else {
              levelForRecord = null;
            }
          }
          if (levelForRecord === 1) {
            // Level 1 sees only items not yet recommended/approved at L1
            if (recStatus === "Recommended" || recStatus === "Approved") return false;
          } else if (levelForRecord === 2) {
            // Level 2 normally sees only items already recommended at L1.
            // Exception: if the REQUESTER is themselves the Level 1 approver in their
            // base BU FOR THIS SPECIFIC REQUEST TYPE, there is no one below them to
            // recommend it — skip the recommendation gate so Level 2 can act directly.
            // If Level 1 is assigned to a DIFFERENT employee, normal L1→L2 applies.
            const requesterBuEntry = allPersonnel.find(
              (pp) => Number(pp.employeeId) === empId && String(pp.base).toLowerCase() === "yes",
            );
            const currentReqId = employeeRequestMap.get(selectedType);
            const requesterIsLevel1 = requesterBuEntry && currentReqId !== undefined
              ? allWorkflowsRaw.some(
                  (w) =>
                    w.businessUnitId === requesterBuEntry.businessUnitId &&
                    String(w.employeeId) === String(empId) &&
                    w.employeeRequestId === currentReqId &&
                    w.approvalLevel === 1,
                )
              : false;
            if (!requesterIsLevel1) {
              // Normal path: require recommendation before Level 2 acts
              if (recStatus !== "Recommended" && recStatus !== "Approved") return false;
            }
            // If requesterIsLevel1 for this specific request type, let it through
          }
        }

        const df = String(r[config.dateField] ?? "");
        if (filterMode === "date") {
          if (fromDate && df < fromDate) return false;
          if (toDate && df > toDate) return false;
        } else {
          if (nameFilter.trim()) {
            const name = employeeNameMap.get(empId) ?? "";
            const empNo = employeeNoMap.get(empId) ?? "";
            const search = nameFilter.toLowerCase();
            const combined = `${empNo} - ${name}`.toLowerCase();
            if (!name.toLowerCase().includes(search) && !empNo.toLowerCase().includes(search) && !combined.includes(search)) return false;
          }
        }
        return true;
      });

      const mappedRows: RequestRow[] = filtered.map((r) => ({
        id: r[config.idField] as number,
        employeeId: Number(r.employeeId),
        employeeName:
          employeeNameMap.get(Number(r.employeeId)) ??
          `Employee #${r.employeeId}`,
        dateFiled: String(r[config.dateField] ?? ""),
        status: String(r[config.statusField] ?? ""),
        summary: config.getSummary(r),
        typeKey: selectedType,
        raw: r,
      }));

      setRows(mappedRows);
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to load records." });
    } finally {
      setIsLoading(false);
    }
  }, [
    businessUnitId,
    buEmployeeIds,
    isAllBu,
    allBuEmployeeIds,
    allWorkflowsRaw,
    allPersonnel,
    selectedType,
    selectedStatus,
    recStatusFilter,
    filterMode,
    fromDate,
    toDate,
    nameFilter,
    employeeNameMap,
    employeeNoMap,
    myApprovalLevel,
    loggedInId,
    employeeRequestMap,
    isCoApproving,
    coApprovedForIds,
  ]);

  // ── Approve / Disapprove ─────────────────────────────────────────────────

  const handleAction = async (
    row: RequestRow,
    action: "approve" | "disapprove" | "recommend",
  ) => {
    const actionLabel =
      action === "approve" ? "Approve" : action === "disapprove" ? "Disapprove" : "Recommend";
    const confirmColor =
      action === "approve" ? "#16a34a" : action === "recommend" ? "#d97706" : "#dc2626";

    const { value: remarks, isConfirmed } = await Swal.fire({
      title: `${actionLabel} Request`,
      html: `<p style="font-size:14px;margin-bottom:8px;">Employee: <strong>${row.employeeName}</strong></p>
             <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">${row.summary}</p>`,
      input: "textarea",
      inputLabel: "Remarks (optional)",
      inputPlaceholder: "Enter remarks...",
      showCancelButton: true,
      confirmButtonText: actionLabel,
      confirmButtonColor: confirmColor,
    });

    if (!isConfirmed) return;

    const config = getConfig(row.typeKey);
    if (!config) return;

    try {
      let res: Response;

      if (config.useUpdateForAction) {
        // Leave Application: send full DTO with modified fields
        if (action === "recommend") {
          const updated = {
            ...row.raw,
            recommendationStatus: "Recommended",
            recommendingApprovalById: loggedInId,
            recommendationMessage: remarks ?? "",
          };
          res = await fetchWithAuth(config.approveUrl(row.id), {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        } else {
          const updated = {
            ...row.raw,
            status: action === "approve" ? "Approved" : "Disapproved",
            approvedById: loggedInId,
            approvalMessage: remarks ?? "",
          };
          const url =
            action === "approve"
              ? config.approveUrl(row.id)
              : config.disapproveUrl(row.id);
          res = await fetchWithAuth(url, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        }
      } else if (action === "recommend") {
        res = await fetchWithAuth(config.recommendUrl!(row.id), {
          method: "PUT",
          body: JSON.stringify({
            recommendedById: loggedInId,
            remarks: remarks ?? "",
          }),
        });
      } else {
        const url =
          action === "approve"
            ? config.approveUrl(row.id)
            : config.disapproveUrl(row.id);
        res = await fetchWithAuth(url, {
          method: "PUT",
          body: JSON.stringify({
            approvedById: loggedInId,
            remarks: remarks ?? "",
          }),
        });
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Action failed");
      }

      Toast.fire({
        icon: "success",
        title: `Request ${action === "approve" ? "approved" : action === "disapprove" ? "disapproved" : "recommended"} successfully`,
      });

      // Refresh the list
      handleLoad();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  };

  // ── Status badge helper ───────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const lower = status.toLowerCase();
    const bg =
      lower === "approved"
        ? "#dcfce7"
        : lower === "disapproved"
          ? "#fee2e2"
          : "#fef9c3";
    const color =
      lower === "approved"
        ? "#166534"
        : lower === "disapproved"
          ? "#991b1b"
          : "#854d0e";
    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: bg,
          color,
        }}
      >
        {status}
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────

  // Per-row approval level — in "All BU" mode each row may belong to a different BU
  const getRowLevel = (row: RequestRow): number | null => {
    if (!isAllBu) return myApprovalLevel;
    // Use the base=Yes entry to find the correct routing BU for this row's employee
    const p = allPersonnel.find(
      (pp) =>
        Number(pp.employeeId) === Number(row.employeeId) &&
        String(pp.base).toLowerCase() === "yes",
    );
    if (!p) return null;
    const reqId = employeeRequestMap.get(row.typeKey);
    if (!reqId) return null;
    // Match by the effective approver IDs (principal IDs for co-approver, own ID for direct approver)
    const effectiveApproverIds = isCoApproving
      ? coApprovedForIds.map(String)
      : [String(loggedInId)];
    const wf = allWorkflowsRaw.find(
      (w) =>
        w.businessUnitId === p.businessUnitId &&
        w.employeeRequestId === reqId &&
        effectiveApproverIds.includes(String(w.employeeId)),
    );
    return wf?.approvalLevel ?? null;
  };

  /**
   * Returns true when the current approver's level is the HIGHEST level
   * configured for that BU + request type — making them the final approver.
   * Works for any number of levels (1→5, 1→10, etc.).
   * All levels below the max get "Recommend"; the max level gets "Approve".
   */
  const isFinalApprover = (row: RequestRow): boolean => {
    const level = getRowLevel(row);
    if (level === null) return false;
    // Resolve the BU for this row
    const p = isAllBu
      ? allPersonnel.find(
          (pp) =>
            Number(pp.employeeId) === Number(row.employeeId) &&
            String(pp.base).toLowerCase() === "yes",
        )
      : allPersonnel.find(
          (pp) =>
            pp.businessUnitId === businessUnitId &&
            String(pp.base).toLowerCase() === "yes",
        );
    if (!p) return false;
    const reqId = employeeRequestMap.get(row.typeKey) ?? employeeRequestMap.get(selectedType);
    if (!reqId) return false;
    // Find the maximum approval level configured for this BU + request type
    const maxLevel = allWorkflowsRaw
      .filter(
        (w) =>
          w.businessUnitId === p.businessUnitId &&
          w.employeeRequestId === reqId,
      )
      .reduce((max, w) => Math.max(max, w.approvalLevel ?? 0), 0);
    return maxLevel > 0 && level >= maxLevel;
  };

  if (isApprover === null) {
    return (
      <div className={modalStyles.Modal}>
        <div className={modalStyles.modalContent}>
          <div className={modalStyles.modalBody} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isApprover) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <p style={{ color: "#6b7280", fontSize: 15, textAlign: "center" }}>
          You are not designated as an approver for any business unit.
        </p>
      </div>
    );
  }

  return (
    <div className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        {/* Header */}
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Approval Request</h2>
        </div>

        <div className={modalStyles.modalBody} style={{ padding: "20px" }}>
          {/* Business Unit selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 600, whiteSpace: "nowrap" }}>
              Business Unit:
            </span>
            {myBusinessUnits.length > 1 ? (
              <select
                value={isAllBu ? "all" : (businessUnitId ?? "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "all") {
                    setIsAllBu(true);
                    setBusinessUnitName("All Business Units");
                    setRows([]);
                  } else {
                    handleBuChange(Number(val));
                  }
                }}
                style={{ ...inputStyle, minWidth: 240 }}
              >
                <option value="all">All Business Units</option>
                {myBusinessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>{bu.name}</option>
                ))}
              </select>
            ) : (
              <strong style={{ fontSize: 13 }}>{businessUnitName}</strong>
            )}
          </div>

          {/* ── Co-Approver notice ────────────────────────────── */}
          {isCoApproving && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 16px",
                marginBottom: 20,
                backgroundColor: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: 0 }}>
                  Co-Approver Mode
                </p>
                <p style={{ fontSize: 12, color: "#78350f", margin: "2px 0 0" }}>
                  You are acting as a Co-Approver on behalf of:{" "}
                  <strong>
                    {coApprovedForIds
                      .map((id) => employeeNameMap.get(id) ?? `Employee #${id}`)
                      .join(", ")}
                  </strong>
                  . You have been granted access to facilitate approvals in their absence.
                </p>
              </div>
            </div>
          )}

          {/* ── Approval Workflow (read-only) ──────────────────── */}
          <div
            style={{
              marginBottom: 24,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                backgroundColor: "#3b4fa8",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                ☰ Approval Workflow Levels
              </span>
              <span style={{ color: "#c7d2fe", fontSize: 12 }}>
                — {getConfig(selectedType)?.label ?? currentRequestName}
              </span>
            </div>

            {workflowLoading ? (
              <p style={{ padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>
                Loading workflow...
              </p>
            ) : workflowRows.length === 0 ? (
              <div style={{ padding: "14px 16px" }}>
                {isAllBu ? (
                  <>
                    <p style={{ fontSize: 13, color: "#374151", marginBottom: 12, fontWeight: 600 }}>
                      Showing requests across all your assigned business units. Your approval levels for{" "}
                      <span style={{ color: "#3b4fa8" }}>
                        {REQUEST_CONFIGS[selectedType]?.label ?? getConfig(selectedType)?.label ?? currentRequestName}
                      </span>
                      :
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {myBusinessUnits.map((bu) => {
                        const reqId = employeeRequestMap.get(selectedType);
                        const effectiveApproverIds = isCoApproving
                          ? coApprovedForIds.map(String)
                          : [String(loggedInId)];
                        const wf = allWorkflowsRaw.find(
                          (w) =>
                            w.businessUnitId === bu.id &&
                            w.employeeRequestId === reqId &&
                            effectiveApproverIds.includes(String(w.employeeId)),
                        );
                        const level = wf?.approvalLevel;
                        const levelLabel = level === 1 ? "Recommender (Level 1)" : level === 2 ? "Final Approver (Level 2)" : level ? `Level ${level}` : "Not assigned";
                        const chipColor = level === 1 ? "#d97706" : level === 2 ? "#16a34a" : "#9ca3af";
                        return (
                          <div
                            key={bu.id}
                            style={{
                              border: `1px solid ${chipColor}`,
                              borderRadius: 8,
                              padding: "8px 14px",
                              backgroundColor: "#fff",
                              minWidth: 200,
                            }}
                          >
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 4 }}>
                              {bu.name}
                            </p>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: chipColor,
                                backgroundColor: `${chipColor}18`,
                                padding: "2px 8px",
                                borderRadius: 10,
                              }}
                            >
                              {levelLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>
                      Select a specific business unit above to view its full approval workflow chain.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>
                    No approval workflow configured for this request type.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ ...thStyle, color: "#374151" }}>Approval Level</th>
                      <th style={{ ...thStyle, color: "#374151" }}>Employee Name</th>
                      <th style={{ ...thStyle, color: "#374151" }}>Status</th>
                      <th style={{ ...thStyle, color: "#374151" }}>Under</th>
                      <th style={{ ...thStyle, color: "#374151" }}>Employee Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowRows.map((wf, i) => (
                      <tr
                        key={wf.approvalWorkflowId}
                        style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}
                      >
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: "#1e3a5f" }}>
                          {wf.approvalLevel}
                        </td>
                        <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 500 }}>
                          {wf.employeeName}
                        </td>
                        <td style={{ ...tdStyle, color: "#2563eb" }}>
                          {wf.personnelStatus}
                        </td>
                        <td style={{ ...tdStyle, color: "#2563eb" }}>
                          {businessUnitName}
                        </td>
                        <td style={{ ...tdStyle, color: "#dc2626" }}>
                          {currentRequestName || (getConfig(selectedType)?.label ?? selectedType)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Filter bar ────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              alignItems: "flex-end",
              padding: "16px",
              backgroundColor: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            {/* Request Type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 240 }}>
              <label style={labelStyle}>Request Type</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setRows([]);
                }}
                style={inputStyle}
              >
                {employeeRequestList.map((er) => (
                  <option key={er.employeeRequestId} value={er.name.toLowerCase()}>
                    {er.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
              <label style={labelStyle}>Status</label>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as StatusFilter)
                }
                style={inputStyle}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Disapproved">Disapproved</option>
              </select>
            </div>

            {/* Recommendation Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
              <label style={labelStyle}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#d97706", marginRight: 5, verticalAlign: "middle" }} />
                Recommendation Status
              </label>
              <select
                value={recStatusFilter}
                onChange={(e) => setRecStatusFilter(e.target.value as RecStatusFilter)}
                style={{ ...inputStyle, borderColor: recStatusFilter !== "All" ? "#d97706" : undefined }}
              >
                <option value="All">All</option>
                <option value="Not Recommended">Not Yet Recommended</option>
                <option value="Recommended">Recommended</option>
                <option value="Disapproved">Disapproved by Recommender</option>
              </select>
            </div>

            {/* Filter Mode */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
              <label style={labelStyle}>Filter By</label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                style={inputStyle}
              >
                <option value="date">By Date Range</option>
                <option value="name">By Employee Name</option>
              </select>
            </div>

            {/* Date Range or Employee Name */}
            {filterMode === "date" ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
                <label style={labelStyle}>Employee Name</label>
                <input
                  type="text"
                  list="bu-employee-names"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search employee name..."
                  style={inputStyle}
                />
                <datalist id="bu-employee-names">
                  {Array.from(buEmployeeIds).map((empId) => {
                    const name = employeeNameMap.get(empId);
                    const empNo = employeeNoMap.get(empId);
                    if (!name) return null;
                    return <option key={empId} value={empNo ? `${empNo} - ${name}` : name} />;
                  })}
                </datalist>
              </div>
            )}

            {/* Load button */}
            <button
              onClick={handleLoad}
              disabled={isLoading}
              style={{
                padding: "8px 24px",
                backgroundColor: "#1e3a5f",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                alignSelf: "flex-end",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Loading..." : "Load"}
            </button>
          </div>

          {/* ── Results ───────────────────────────────────────── */}
          {!isLoading && rows.length === 0 && (
            <p style={{ color: "#6b7280", fontSize: 13 }}>
              No records found. Select filters and click Load.
            </p>
          )}

          {rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                {rows.length} record{rows.length !== 1 ? "s" : ""} found
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e3a5f", color: "#fff" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Employee Name</th>
                    <th style={thStyle}>Date Filed</th>
                    <th style={thStyle}>Details</th>
                    <th style={thStyle}>Status</th>
                    {selectedStatus === "Pending" && (
                      <th style={thStyle}>
                        {isAllBu ? "Actions" : myApprovalLevel === 1 ? "Actions (Recommend)" : "Actions (Approve)"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? "#f9fafb" : "#ffffff",
                      }}
                    >
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {row.employeeName}
                      </td>
                      <td style={tdStyle}>{row.dateFiled}</td>
                      <td style={{ ...tdStyle, color: "#4b5563" }}>
                        {row.summary}
                      </td>
                      <td style={tdStyle}>{statusBadge(row.status)}</td>
                      {selectedStatus === "Pending" && (
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {isFinalApprover(row) ? (
                              <button
                                style={approveBtnStyle}
                                onClick={() => handleAction(row, "approve")}
                              >
                                Approve
                              </button>
                            ) : (
                              <button
                                style={recommendBtnStyle}
                                onClick={() => handleAction(row, "recommend")}
                              >
                                Recommend
                              </button>
                            )}
                            <button
                              style={disapproveBtnStyle}
                              onClick={() => handleAction(row, "disapprove")}
                            >
                              Disapprove
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
