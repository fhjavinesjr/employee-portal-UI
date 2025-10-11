"use client";
import React from "react";
import styles from "@/styles/LeaveApplication.module.scss";

// Define the structure of each leave record
interface Leave {
  dateFiled: string;
  from: string;
  to: string;
  leaveType: string;
  status: string;
}

// Define the props that the component expects
interface LeaveApplicationTableProps {
  data: Leave[];
}

export default function LeaveApplicationTable({ data }: LeaveApplicationTableProps) {
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
          {data.map((leave: Leave, index: number) => (
            <tr key={index}>
              <td>{leave.dateFiled}</td>
              <td>
                {leave.from} - {leave.to}
              </td>
              <td>{leave.leaveType}</td>
              <td>Perez, Ramona Rebelina T.</td>
              <td>Magaso, Violeta C.</td>
              <td>{leave.status}</td>
              <td>
               <button className={styles.optionBtn}>🖨️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
