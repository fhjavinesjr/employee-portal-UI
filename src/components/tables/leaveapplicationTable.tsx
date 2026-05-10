"use client";
import React from "react";
import styles from "@/styles/LeaveApplication.module.scss";

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
  return (
    <div className={styles.leaveapplicationTable}>
     
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
          {data.map((leave: Leave, index: number) => {
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
