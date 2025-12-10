"use client";
import React from "react";
import {
  CalendarDays,
  UserCheck,
  Gift,
  FileText,
  Clock,
  Megaphone,
} from "lucide-react";
import styles from "@/styles/DashboardPage.module.scss";

export default function Dashboard() {
  const summaryData = [
    {
      title: "Leave Balance",
      value: "Vacation: 5 | Sick: 3",
      icon: <CalendarDays size={24} />,
    },
    {
      title: "Attendance Summary",
      value: "20 Days Present",
      icon: <UserCheck size={24} />,
    },
    {
      title: "Upcoming Holidays",
      value: "Oct 28 - Holiday",
      icon: <Gift size={24} />,
    },
    {
      title: "Payslip Access",
      value: "Last Payslip: Sept 2025",
      icon: <FileText size={24} />,
    },
    {
      title: "Pending Requests",
      value: "2 Awaiting Approval",
      icon: <Clock size={24} />,
    },
  ];

  const announcements = [
    {
      title: "Notice to the Public",
      date: "October 25, 2025",
      description: "Important university-wide system maintenance this weekend.",
    },
    {
      title: "Halloween Event in the Office",
      date: "November 1, 2025",
      description:
        "All departments are encouraged to join the halloween event.",
    },
    {
      title: "Power Interruption Notice",
      date: "October 18, 2025",
      description: "Scheduled maintenance on main building from 9 AM to 12 NN.",
    },
    {
      title: "New HR Guidelines Released",
      date: "October 10, 2025",
      description:
        "Updated policies on attendance and leave filing now available.",
    },
    {
      title: "Health Awareness Week",
      date: "October 5, 2025",
      description:
        "Join the week-long health seminars and free medical checkups.",
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
          <div key={i} className={styles.card}>
            <div className={styles.cardTop}>
              {item.icon}
              <h3>{item.title}</h3>
            </div>
            <p>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 📰 Announcements Section */}
      <div className={styles.announcementWrapper}>
        <div className={styles.announcementsSection}>
          <div className={styles.sectionHeader}>
            <Megaphone size={20} />
            <h3>Announcements </h3>
          </div>

          <div className={styles.announcementContainer}>
            {announcements.map((item, i) => (
              <div key={i} className={styles.announcementCard}>
                <h4>{item.title}</h4>
                <p className={styles.date}>{item.date}</p>
                <p className={styles.desc}>{item.description}</p>
                <button className={styles.readMore}>Read More</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
