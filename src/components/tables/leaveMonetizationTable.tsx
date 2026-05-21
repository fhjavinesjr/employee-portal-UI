"use client";
import React, { useState, useEffect } from "react";
import styles from "@/styles/LeaveApplication.module.scss";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface MonetizationRecord {
  id: number;
  dateFiled: string;
  noOfDaysSL: number;
  noOfDaysVL: number;
  totalDays: number;
  slBalanceBefore: number | null;
  vlBalanceBefore: number | null;
  slBalanceAfter: number | null;
  vlBalanceAfter: number | null;
  reason: string | null;
  recommendationStatus: string;
  approvalStatus: string;
  payrollIncluded: boolean;
  recommendingOfficer?: string;
  approvedBy?: string;
}

interface Props {
  data: MonetizationRecord[];
  onEdit?: (record: MonetizationRecord) => void;
  onDelete?: (record: MonetizationRecord) => void;
}

function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return val.toFixed(3);
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Approved" ? "#15803d" :
    status === "Disapproved" ? "#dc2626" :
    "#92400e";
  const bg =
    status === "Approved" ? "#dcfce7" :
    status === "Disapproved" ? "#fef2f2" :
    "#fef9c3";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "999px",
      fontSize: "0.78rem",
      fontWeight: 600,
      color,
      background: bg,
      border: `1px solid ${bg}`,
    }}>
      {status}
    </span>
  );
}

const th: React.CSSProperties = {
  padding: "8px 10px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
  textAlign: "left",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#374151",
};

const td: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
  fontSize: "0.82rem",
  color: "#374151",
};

export default function LeaveMonetizationTable({ data, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  const filteredData = data.filter((record) => {
    const q = search.toLowerCase();
    return (
      record.dateFiled.toLowerCase().includes(q) ||
      (record.reason ?? "").toLowerCase().includes(q) ||
      record.recommendationStatus.toLowerCase().includes(q) ||
      record.approvalStatus.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className={styles.leaveapplicationTable}>
      {/* Search + Pagination toolbar */}
      <div className={styles.tableToolbar}>
        <input
          type="text"
          placeholder="Search by date, reason, status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.paginationControls}>
          <label>Rows:</label>
          <select
            className={styles.rowSelect}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <span className={styles.recordInfo}>
            {filteredData.length === 0 ? "0" : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
          </span>
          <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</button>
          <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
          <span className={styles.pageIndicator}>Page {currentPage} of {totalPages || 1}</span>
          <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
          <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>Last</button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>Date Filed</th>
              <th style={th}>VL Days</th>
              <th style={th}>SL Days</th>
              <th style={th}>Total Days</th>
              <th style={th}>VL Before</th>
              <th style={th}>VL After</th>
              <th style={th}>SL Before</th>
              <th style={th}>SL After</th>
              <th style={th}>Reason</th>
              <th style={th}>Rec. Status</th>
              <th style={th}>Approval</th>
              <th style={th}>Payroll</th>
              <th style={th}>Recommending Officer</th>
              <th style={th}>Approved By</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={15} style={{ ...td, textAlign: "center", color: "#6b7280", padding: "1.5rem" }}>
                  No leave monetization records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((record) => (
                <tr key={record.id}>
                  <td style={td}>{record.dateFiled}</td>
                  <td style={td}>{fmt(record.noOfDaysVL)}</td>
                  <td style={td}>{fmt(record.noOfDaysSL)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(record.totalDays)}</td>
                  <td style={td}>{fmt(record.vlBalanceBefore)}</td>
                  <td style={td}>{record.vlBalanceAfter !== null ? fmt(record.vlBalanceAfter) : "—"}</td>
                  <td style={td}>{fmt(record.slBalanceBefore)}</td>
                  <td style={td}>{record.slBalanceAfter !== null ? fmt(record.slBalanceAfter) : "—"}</td>
                  <td style={{ ...td, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}
                    title={record.reason ?? ""}>
                    {record.reason ?? "—"}
                  </td>
                  <td style={td}><StatusBadge status={record.recommendationStatus} /></td>
                  <td style={td}><StatusBadge status={record.approvalStatus} /></td>
                  <td style={td}>
                    <StatusBadge status={record.payrollIncluded ? "Yes" : "No"} />
                  </td>
                  <td style={td}>{record.recommendingOfficer ?? "—"}</td>
                  <td style={td}>{record.approvedBy ?? "—"}</td>
                  <td style={td}>
                    {record.recommendationStatus === "Pending" && record.approvalStatus === "Pending" ? (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button style={{ padding: "3px 10px", borderRadius: "4px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }} onClick={() => onEdit?.(record)}>Edit</button>
                        <button style={{ padding: "3px 10px", borderRadius: "4px", border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }} onClick={() => onDelete?.(record)}>Delete</button>
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
