"use client";
import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  UserCheck,
  Gift,
  FileText,
  Clock,
  Megaphone,
  Timer,
} from "lucide-react";
import styles from "@/styles/DashboardPage.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;
const API_BASE_URL_ADMINISTRATIVE = process.env.NEXT_PUBLIC_API_BASE_URL_ADMINISTRATIVE;

interface LeaveBalanceDTO {
  vacationLeaveBalance: number | null;
  sickLeaveBalance: number | null;
  splBalance: number | null;
  forcedLeaveBalance: number | null;
  lastProcessedPeriodEnd?: string | null;
}

interface AnnouncementDTO {
  announcementId: number;
  effectivityDate: string | null;
  effectiveUntil: string | null;
  title: string;
  content: string;
}

export default function Dashboard() {
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceDTO | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isCocModalOpen, setIsCocModalOpen] = useState(false);

  const [cocBalance, setCocBalance] = useState<number | null>(null);
  const [isCocLoading, setIsCocLoading] = useState(true);

  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDTO | null>(null);

  useEffect(() => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) { setIsBalanceLoading(false); setIsCocLoading(false); return; }

    fetchWithAuth(`${API_BASE_URL_HRM}/api/coc/balance/${empId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCocBalance(data?.availableHours ?? null))
      .catch(() => setCocBalance(null))
      .finally(() => setIsCocLoading(false));

    fetchWithAuth(`${API_BASE_URL_HRM}/api/leave-balance/current/${empId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLeaveBalance(data ?? null))
      .catch(() => setLeaveBalance(null))
      .finally(() => setIsBalanceLoading(false));
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL_ADMINISTRATIVE}/api/announcement/get-all`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AnnouncementDTO[]) => setAnnouncements(data ?? []))
      .catch(() => setAnnouncements([]))
      .finally(() => setIsAnnouncementsLoading(false));
  }, []);

  const fmt = (v: number | null | undefined) =>
    v == null ? "—" : v.toFixed(3);

  const leaveBalanceValue = isBalanceLoading
    ? "Loading…"
    : leaveBalance
      ? `VL: ${fmt(leaveBalance.vacationLeaveBalance)} | SL: ${fmt(leaveBalance.sickLeaveBalance)}`
      : "Unavailable";

  const cocBalanceValue = isCocLoading
    ? "Loading…"
    : cocBalance == null
      ? "Unavailable"
      : `${cocBalance.toFixed(3)} hrs`;

  const summaryData = [
    {
      title: "Leave Balance",
      value: leaveBalanceValue,
      icon: <CalendarDays size={24} />,
      onClick: () => setIsLeaveModalOpen(true),
    },
    {
      title: "COC Balance",
      value: cocBalanceValue,
      icon: <Timer size={24} />,
      onClick: () => setIsCocModalOpen(true),
    },
    {
      title: "Attendance Summary",
      value: "20 Days Present",
      icon: <UserCheck size={24} />,
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: "Upcoming Holidays",
      value: "Oct 28 - Holiday",
      icon: <Gift size={24} />,
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: "Payslip Access",
      value: "Last Payslip: Sept 2025",
      icon: <FileText size={24} />,
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: "Pending Requests",
      value: "2 Awaiting Approval",
      icon: <Clock size={24} />,
      onClick: undefined as (() => void) | undefined,
    },
  ];

  return (
    <div className={styles.dashboardContainer}>
      {/* Title Section */}
      <div className={styles.headerSection}>
        <h2 className={styles.pageTitle}>Dashboard</h2>
      </div>

      <div className={styles.divider}></div>
      <p className={styles.subtitle}>Here’s your quick overview for today.</p>

      {/* Summary Cards */}
      <div className={styles.summaryContainer}>
        {summaryData.map((item, i) => (
          <div key={i} className={styles.card} onClick={item.onClick}>
            <div className={styles.cardTop}>
              {item.icon}
              <h3>{item.title}</h3>
            </div>
            <p>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Leave Balance Modal */}
      {isLeaveModalOpen && (
        <div className={styles.leaveModalOverlay} onClick={() => setIsLeaveModalOpen(false)}>
          <div className={styles.leaveModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.leaveModalHeader}>
              <h3>Leave Balance</h3>
              <button className={styles.leaveModalClose} onClick={() => setIsLeaveModalOpen(false)}>✕</button>
            </div>
            <div className={styles.leaveModalBody}>
              {isBalanceLoading ? (
                <p className={styles.leaveModalLoading}>Loading leave balance...</p>
              ) : !leaveBalance ? (
                <p className={styles.leaveModalEmpty}>No leave balance data available.</p>
              ) : (
                <>
                  {leaveBalance.lastProcessedPeriodEnd && (
                    <p className={styles.leaveModalAsOfDate}>
                      As of: {leaveBalance.lastProcessedPeriodEnd}
                    </p>
                  )}
                  <table className={styles.leaveBalanceTable}>
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Vacation Leave (VL)</td>
                        <td>{fmt(leaveBalance.vacationLeaveBalance)}</td>
                      </tr>
                      <tr>
                        <td>Sick Leave (SL)</td>
                        <td>{fmt(leaveBalance.sickLeaveBalance)}</td>
                      </tr>
                      <tr>
                        <td>Special Privilege Leave (SPL)</td>
                        <td>{fmt(leaveBalance.splBalance)}</td>
                      </tr>
                      <tr>
                        <td>Forced Leave</td>
                        <td>{fmt(leaveBalance.forcedLeaveBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COC Balance Modal */}
      {isCocModalOpen && (
        <div className={styles.leaveModalOverlay} onClick={() => setIsCocModalOpen(false)}>
          <div className={styles.leaveModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.leaveModalHeader}>
              <h3>Compensatory Overtime Credit (COC)</h3>
              <button className={styles.leaveModalClose} onClick={() => setIsCocModalOpen(false)}>✕</button>
            </div>
            <div className={styles.leaveModalBody}>
              {isCocLoading ? (
                <p className={styles.leaveModalLoading}>Loading COC balance…</p>
              ) : cocBalance == null ? (
                <p className={styles.leaveModalEmpty}>No COC balance data available.</p>
              ) : (
                <table className={styles.leaveBalanceTable}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Available Hours</td>
                      <td>{cocBalance.toFixed(3)} hrs</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcements Section */}
      <div className={styles.announcementWrapper}>
        <div className={styles.announcementsSection}>
          <div className={styles.sectionHeader}>
            <Megaphone size={20} />
            <h3>Announcements</h3>
          </div>

          <div className={styles.announcementContainer}>
            {isAnnouncementsLoading ? (
              <p>Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p>No announcements available.</p>
            ) : (
              announcements.map((item) => (
                <div
                  key={item.announcementId}
                  className={styles.announcementCard}
                  onClick={() => setSelectedAnnouncement(item)}
                >
                  <h4>{item.title}</h4>
                  <p className={styles.date}>{item.effectivityDate ?? ""}</p>
                  <p className={styles.desc}>{item.content}</p>
                  <span className={styles.readMoreHint}>Read More</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className={styles.announcementModalOverlay} onClick={() => setSelectedAnnouncement(null)}>
          <div className={styles.announcementModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.announcementModalHeader}>
              <h3>{selectedAnnouncement.title}</h3>
              <button className={styles.announcementModalClose} onClick={() => setSelectedAnnouncement(null)}>✕</button>
            </div>
            <div className={styles.announcementModalBody}>
              <p className={styles.announcementModalDate}>
                {selectedAnnouncement.effectivityDate}
                {selectedAnnouncement.effectiveUntil ? ` – ${selectedAnnouncement.effectiveUntil}` : ""}
              </p>
              <p className={styles.announcementModalContent}>{selectedAnnouncement.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
