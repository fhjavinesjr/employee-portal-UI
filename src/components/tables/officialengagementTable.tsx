"use client";

import React from "react";
import styles from "@/styles/OfficialEngagementTable.module.scss";

export interface OfficialBusiness {
  dateFiled: string;
  dateCoverage: string;
  recommendingOfficer: string;
  approvedBy: string;
  status: string;
  approvalDate: string;
}

interface OfficialEngagementTableProps {
  data: OfficialBusiness[];
}

export default function OfficialEngagementTable({ data }: OfficialEngagementTableProps) {
  return (
    <div className={styles.officialEngagementTable}>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date Filed</th>
              <th>OB Date Coverage</th>
              <th>Recommending Officer</th>
              <th>Approved By</th>
              <th>Status</th>
              <th>Approval Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7}>No records found</td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index}>
                  <td>{row.dateFiled}</td>
                  <td>{row.dateCoverage}</td>
                  <td>{row.recommendingOfficer}</td>
                  <td>{row.approvedBy}</td>
                  <td>{row.status}</td>
                  <td>{row.approvalDate}</td>
                  <td>
                    <button className={styles.optionBtn}>🖨️</button>
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
