"use client";
import React, { useState, useEffect } from "react";
import styles from "@/styles/LeaveApplication.module.scss";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Define the structure of each leave record
interface Leave {
  id: number;
  dateFiled: string;
  from: string;
  to: string;
  leaveType: string;
  commutation: string;
  details: string;
  status: string;
  recommendationStatus: string | null;
  approvedStatus: string | null;
  recommendingOfficer: string;
  approvedBy: string;
}

// Define the props that the component expects
interface LeaveApplicationTableProps {
  data: Leave[];
  onEdit?: (leave: Leave) => void;
  onDelete?: (id: number) => void;
}

export default function LeaveApplicationTable({ data, onEdit, onDelete }: LeaveApplicationTableProps) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  const filteredData = data.filter((leave) => {
    const q = search.toLowerCase();
    return (
      leave.leaveType.toLowerCase().includes(q) ||
      leave.dateFiled.toLowerCase().includes(q) ||
      leave.status.toLowerCase().includes(q)
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
          placeholder="Search by type, date, status…"
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

     
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date Filed</th>
            <th>Leave Date Coverage</th>
            <th>Type</th>
            <th>Recommending Officer</th>
            <th>Approved By</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "#6b7280", padding: "1rem" }}>No records found.</td></tr>
          ) : paginatedData.map((leave: Leave, index: number) => {
            const canEditDelete = leave.status === "Pending" && (!leave.recommendationStatus || leave.recommendationStatus === "Pending");
            return (
              <tr key={index}>
                <td>{leave.dateFiled}</td>
                <td>
                  {leave.from} - {leave.to}
                </td>
                <td>{leave.leaveType}</td>
                <td>{leave.recommendingOfficer ?? "—"}</td>
                <td>{leave.approvedBy ?? "—"}</td>
                <td>{leave.status}</td>
                <td>
                  {canEditDelete ? (
                    <>
                      <button onClick={() => onEdit?.(leave)} style={editBtnStyle}>✏️ Edit</button>
                      <button onClick={() => onDelete?.(leave.id)} style={deleteBtnStyle}>🗑️ Delete</button>
                    </>
                  ) : (
                    <button className={styles.optionBtn}>🖨️</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const editBtnStyle: React.CSSProperties = { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", marginRight: "0.3rem", fontSize: "0.8rem" };
const deleteBtnStyle: React.CSSProperties = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", fontSize: "0.8rem" };
