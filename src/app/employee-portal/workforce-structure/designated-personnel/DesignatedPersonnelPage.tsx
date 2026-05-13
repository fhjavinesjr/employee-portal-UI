"use client";

import React, { useEffect, useState } from "react";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { FaUsers } from "react-icons/fa";

const API_ADMIN = process.env.NEXT_PUBLIC_API_BASE_URL_ADMINISTRATIVE;

interface PersonnelEntry {
  id: number;
  employeeId: number;
  businessUnitId: number;
  head: boolean;
  coApprover: boolean;
  otherStatus: string | null;
  base: string | null;
}

interface DisplayRow {
  employeeNo: string;
  employeeName: string;
  status: string;
  otherStatus: string;
  base: string;
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "center",
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: "nowrap",
  color: "#374151",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
  textAlign: "center",
  verticalAlign: "middle",
};

export default function DesignatedPersonnelPage() {
  const loggedInId = localStorageUtil.getEmployeeId();

  const [businessUnitName, setBusinessUnitName] = useState<string>("");
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!loggedInId) {
      setAccessDenied(true);
      setIsLoading(false);
      return;
    }

    const employees = localStorageUtil.getEmployees();
    const employeeMap = new Map<number, { employeeNo: string; fullName: string }>();
    employees.forEach((e) =>
      employeeMap.set(e.employeeId, { employeeNo: e.employeeNo, fullName: e.fullName }),
    );

    Promise.all([
      fetchWithAuth(`${API_ADMIN}/api/manage-personnel/get-all`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithAuth(`${API_ADMIN}/api/businessUnits/get-all`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(
        ([
          personnel,
          businessUnits,
        ]: [
          PersonnelEntry[],
          Array<{ businessUnitsId: number; businessUnitsName: string }>,
        ]) => {
          // Find logged-in user's base business unit
          const myEntry = personnel.find(
            (p) =>
              String(p.employeeId) === String(loggedInId) &&
              p.base?.toLowerCase() === "yes",
          );

          if (!myEntry) {
            setAccessDenied(true);
            setIsLoading(false);
            return;
          }

          const bu = businessUnits.find(
            (u) => u.businessUnitsId === myEntry.businessUnitId,
          );
          setBusinessUnitName(bu?.businessUnitsName ?? "");

          // All personnel in the same business unit
          const buPersonnel = personnel.filter(
            (p) => p.businessUnitId === myEntry.businessUnitId,
          );

          const displayRows: DisplayRow[] = buPersonnel.map((p) => {
            const emp = employeeMap.get(Number(p.employeeId));
            const status = p.head
              ? "Head"
              : p.coApprover
                ? "Co-Approver"
                : "Rank and File";
            return {
              employeeNo: emp?.employeeNo ?? `ID:${p.employeeId}`,
              employeeName: emp?.fullName ?? `Employee #${p.employeeId}`,
              status,
              otherStatus: p.otherStatus ?? "",
              base: p.base ?? "No",
            };
          });

          setRows(displayRows);
        },
      )
      .catch(() => setAccessDenied(true))
      .finally(() => setIsLoading(false));
  }, [loggedInId]);

  if (isLoading) {
    return (
      <div className={modalStyles.Modal}>
        <div className={modalStyles.modalContent}>
          <div
            className={modalStyles.modalBody}
            style={{ padding: 40, textAlign: "center", color: "#6b7280" }}
          >
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className={modalStyles.Modal}>
        <div className={modalStyles.modalContent}>
          <div className={modalStyles.modalHeader}>
            <h2 className={modalStyles.mainTitle}>Designated Personnel</h2>
          </div>
          <div className={modalStyles.modalBody} style={{ padding: "20px" }}>
            <p style={{ color: "#dc2626", fontSize: 14 }}>
              You do not have a designated base business unit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Designated Personnel</h2>
        </div>

        <div className={modalStyles.modalBody} style={{ padding: "20px" }}>
          {/* Header banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#3b4fa8",
              padding: "10px 16px",
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <FaUsers style={{ color: "#fff", fontSize: 16 }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
              View ({rows.length}) Designated Personnel
            </span>
            <span
              style={{
                marginLeft: "auto",
                color: "#c7d2fe",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {businessUnitName}
            </span>
          </div>

          {rows.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>
              No designated personnel found for your business unit.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                    <th style={thStyle}>Employee No.</th>
                    <th style={thStyle}>Employee Name</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Other Status</th>
                    <th style={thStyle}>Main Base of Approval Level</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb",
                      }}
                    >
                      <td style={tdStyle}>{row.employeeNo}</td>
                      <td
                        style={{
                          ...tdStyle,
                          color: "#2563eb",
                          fontWeight: 500,
                        }}
                      >
                        {row.employeeName}
                      </td>
                      <td style={tdStyle}>{row.status}</td>
                      <td style={tdStyle}>{row.otherStatus}</td>
                      <td style={tdStyle}>{row.base}</td>
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
