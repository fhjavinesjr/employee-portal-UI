"use client";
import React, { useState, useRef, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import styles from "@/styles/header.module.scss";

export default function Notification() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [openAnnouncements, setOpenAnnouncements] = useState(false);
  const [openLeave, setOpenLeave] = useState(false);
  const [openPayslip, setOpenPayslip] = useState(false);
  const [openMemo, setOpenMemo] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={ref} className={styles.notificationWrapper}>
      <FiBell
        className={styles.icon}
        onClick={() => setShowNotifications(!showNotifications)}
      />

      {showNotifications && (
        <div className={styles.panel}>
          <div className={styles.headerText}>Announcements / Notifications</div>

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
