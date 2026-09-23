"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiBell } from "react-icons/fi";
import styles from "@/styles/header.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import {
  EmployeeSetupWarning,
  getEmployeeSetupWarnings,
} from "@/lib/utils/employeeSetupWarnings";

const API_BASE_URL_HRM = runtimeConfig.getApiUrl("hrm");

interface StaffOvertimeDiscrepancy {
  groupRequestId?: string | null;
  groupDiscrepancySummary?: string | null;
  discrepancyReportedAt?: string | null;
}

export default function Notification() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [openAnnouncements, setOpenAnnouncements] = useState(false);
  const [openLeave, setOpenLeave] = useState(false);
  const [openPayslip, setOpenPayslip] = useState(false);
  const [openMemo, setOpenMemo] = useState(false);
  const [openStaffOvertime, setOpenStaffOvertime] = useState(false);
  const [setupWarnings, setSetupWarnings] = useState<EmployeeSetupWarning[]>([]);
  const [staffOvertimeDiscrepancies, setStaffOvertimeDiscrepancies] = useState<StaffOvertimeDiscrepancy[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  const refreshStaffOvertimeDiscrepancies = useCallback(async () => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL_HRM}/api/overtime-request/staff/filed-by-me`,
      );
      if (!response.ok) {
        setStaffOvertimeDiscrepancies([]);
        return;
      }
      const records = (await response.json()) as StaffOvertimeDiscrepancy[];
      setStaffOvertimeDiscrepancies(
        (Array.isArray(records) ? records : []).filter(
          (record) => Boolean(record.groupDiscrepancySummary?.trim()),
        ),
      );
    } catch {
      setStaffOvertimeDiscrepancies([]);
    }
  }, []);

  useEffect(() => {
    const employeeId = localStorageUtil.getEmployeeId();
    if (!employeeId) return;

    let active = true;
    const refreshWarnings = (forceRefresh = false) => {
      getEmployeeSetupWarnings(employeeId, forceRefresh).then((warnings) => {
        if (active) setSetupWarnings(warnings);
      });
    };
    const handlePermissionsRefreshed = () => refreshWarnings(true);
    refreshWarnings();
    window.addEventListener("portal-permissions-refreshed", handlePermissionsRefreshed);

    return () => {
      active = false;
      window.removeEventListener("portal-permissions-refreshed", handlePermissionsRefreshed);
    };
  }, []);

  useEffect(() => {
    void refreshStaffOvertimeDiscrepancies();
  }, [refreshStaffOvertimeDiscrepancies]);

  // close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // mock data
  const announcements = [{ id: 1, title: "Office Renovation Notice", date: "Oct 21, 2025" }];
  const leaveRequests = [
    { id: 1, title: "Vacation Leave - Approved", date: "Oct 22, 2025" },
    { id: 2, title: "Sick Leave - Pending", date: "Oct 18, 2025" },
  ];
  const payslips = [{ id: 1, title: "September 2025 Payslip Available" }];
  const memos = [{ id: 1, title: "Team Building Reminder" }];
  const notificationCount = setupWarnings.length + staffOvertimeDiscrepancies.length;

  return (
    <div ref={ref} className={styles.notificationWrapper}>
      <button
        type="button"
        className={styles.notificationButton}
        onClick={() => {
          const opening = !showNotifications;
          setShowNotifications(opening);
          if (opening) void refreshStaffOvertimeDiscrepancies();
        }}
        aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
      >
        <FiBell className={styles.icon} />
        {notificationCount > 0 && (
          <span className={styles.notificationBadge}>{notificationCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className={styles.panel}>
          <div className={styles.headerText}>Announcements / Notifications</div>

          {setupWarnings.length > 0 && (
            <div className={styles.setupWarnings}>
              <div className={styles.setupWarningsTitle}>Employee Setup Required</div>
              {setupWarnings.map((warning) => (
                <div key={warning.id} className={styles.setupWarningItem}>
                  <strong>{warning.title}</strong>
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {staffOvertimeDiscrepancies.length > 0 && (
            <div className={styles.row}>
              <button
                type="button"
                className={styles.rowButton}
                onClick={() => {
                  setOpenStaffOvertime((current) => !current);
                  setOpenAnnouncements(false);
                  setOpenLeave(false);
                  setOpenPayslip(false);
                  setOpenMemo(false);
                }}
              >
                Staff Overtime Discrepancies ({staffOvertimeDiscrepancies.length})
                <span className={styles.caret}>{openStaffOvertime ? "▾" : "▸"}</span>
              </button>
              {openStaffOvertime && (
                <ul className={styles.subList}>
                  {staffOvertimeDiscrepancies.map((record, index) => (
                    <li key={record.groupRequestId ?? index} className={styles.item}>
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => {
                          window.location.href = "/employee-portal/selfservice/OvertimeRequest";
                        }}
                      >
                        {record.groupDiscrepancySummary}
                        {record.discrepancyReportedAt && (
                          <span className={styles.meta}>
                            {new Date(record.discrepancyReportedAt).toLocaleString()}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Announcements */}
          <div className={styles.row}>
            <button
              className={styles.rowButton}
              onClick={() => {
                setOpenAnnouncements((p) => !p);
                setOpenLeave(false);
                setOpenPayslip(false);
                setOpenMemo(false);
              }}
            >
              HR or Company Announcements
              <span className={styles.caret}>{openAnnouncements ? "▾" : "▸"}</span>
            </button>

            {openAnnouncements && (
              <ul className={styles.subList}>
                {announcements.map((a) => (
                  <li key={a.id} className={styles.item}>
                    <button
                      className={styles.link}
                      onClick={() => alert(`Open announcement: ${a.title}`)}
                    >
                      {a.title}
                      <span className={styles.meta}>{a.date}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Leave Requests */}
          <div className={styles.row}>
            <button
              className={styles.rowButton}
              onClick={() => {
                setOpenLeave((p) => !p);
                setOpenAnnouncements(false);
                setOpenPayslip(false);
                setOpenMemo(false);
              }}
            >
              Approved/Rejected Leave Requests
              <span className={styles.caret}>{openLeave ? "▾" : "▸"}</span>
            </button>

            {openLeave && (
              <ul className={styles.subList}>
                {leaveRequests.map((l) => (
                  <li key={l.id} className={styles.item}>
                    <button
                      className={styles.link}
                      onClick={() => alert(`View Leave: ${l.title}`)}
                    >
                      {l.title}
                      <span className={styles.meta}>{l.date}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payslips */}
          <div className={styles.row}>
            <button
              className={styles.rowButton}
              onClick={() => {
                setOpenPayslip((p) => !p);
                setOpenAnnouncements(false);
                setOpenLeave(false);
                setOpenMemo(false);
              }}
            >
              New Payslip Available
              <span className={styles.caret}>{openPayslip ? "▾" : "▸"}</span>
            </button>

            {openPayslip && (
              <ul className={styles.subList}>
                {payslips.map((p) => (
                  <li key={p.id} className={styles.item}>
                    <button
                      className={styles.link}
                      onClick={() => alert(`Open Payslip: ${p.title}`)}
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* HR Memo */}
          <div className={styles.row}>
            <button
              className={styles.rowButton}
              onClick={() => {
                setOpenMemo((p) => !p);
                setOpenAnnouncements(false);
                setOpenLeave(false);
                setOpenPayslip(false);
              }}
            >
              HR Memo / Event Reminder
              <span className={styles.caret}>{openMemo ? "▾" : "▸"}</span>
            </button>

            {openMemo && (
              <ul className={styles.subList}>
                {memos.map((m) => (
                  <li key={m.id} className={styles.item}>
                    <button
                      className={styles.link}
                      onClick={() => alert(`View Memo: ${m.title}`)}
                    >
                      {m.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
