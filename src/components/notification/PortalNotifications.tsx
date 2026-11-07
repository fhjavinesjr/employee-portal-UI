"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import { getEmployeeSetupWarnings, type EmployeeSetupWarning } from "@/lib/utils/employeeSetupWarnings";
import { portalNotificationRoute, primeHrNotifications, type PrimeHrNotification } from "@/lib/services/primeHrNotifications";
import styles from "./PortalNotifications.module.scss";

type Discrepancy = { groupRequestId?: string | null; groupDiscrepancySummary?: string | null; discrepancyReportedAt?: string | null };

export default function PortalNotifications({ full = false }: Readonly<{ full?: boolean }>) {
  const router = useRouter(); const ref = useRef<HTMLDivElement>(null); const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false); const [items, setItems] = useState<PrimeHrNotification[]>([]);
  const [unread, setUnread] = useState(0); const [warnings, setWarnings] = useState<EmployeeSetupWarning[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const employeeId = localStorageUtil.getEmployeeId();
    const warningRequest = employeeId ? getEmployeeSetupWarnings(employeeId, true) : Promise.resolve([]);
    const discrepancyRequest = fetchWithAuth(`${runtimeConfig.getApiUrl("hrm")}/api/overtime-request/staff/filed-by-me`).then(async response => response.ok ? response.json() as Promise<Discrepancy[]> : [] as Discrepancy[]).catch(() => [] as Discrepancy[]);
    const notificationRequest = Promise.all([primeHrNotifications.feed(unreadOnly, full ? 50 : 6), primeHrNotifications.unread()]);
    const [setup, overtime, prime] = await Promise.allSettled([warningRequest, discrepancyRequest, notificationRequest]);
    if (setup.status === "fulfilled") setWarnings(setup.value);
    if (overtime.status === "fulfilled") setDiscrepancies((Array.isArray(overtime.value) ? overtime.value : []).filter(row => Boolean(row.groupDiscrepancySummary?.trim())));
    if (prime.status === "fulfilled") {
      const feed = prime.value[0]; const unreadResult = prime.value[1];
      setItems(Array.isArray(feed?.content) ? feed.content : []);
      setUnread(Number.isFinite(unreadResult?.unreadCount) ? Math.max(0, unreadResult.unreadCount) : 0);
    } else { setItems([]); setUnread(0); setError(prime.reason instanceof Error ? prime.reason.message : "PRIME-HRM notifications are temporarily unavailable."); }
    setLoading(false);
  }, [full, unreadOnly]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (full) return; const outside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", outside); return () => document.removeEventListener("mousedown", outside); }, [full]);
  useEffect(() => { const visible = () => { if (document.visibilityState === "visible") void load(); }; document.addEventListener("visibilitychange", visible); return () => document.removeEventListener("visibilitychange", visible); }, [load]);

  const replace = (value: PrimeHrNotification) => setItems(current => current.map(item => item.id === value.id ? value : item));
  const markRead = async (item: PrimeHrNotification) => { if (item.readAt) return item; const value = await primeHrNotifications.markRead(item); replace(value); setUnread(current => Math.max(0, current - 1)); return value; };
  const view = async (item: PrimeHrNotification) => { setError(""); try { await markRead(item); const target = await primeHrNotifications.target(item.id); if (!target.available) { await load(); setError("This workflow item is no longer available or assigned to you."); return; } const route = portalNotificationRoute(target); if (!route) { setError("Open this protected item from the PRIME-HRM module. No Employee Portal destination is approved for it."); return; } setOpen(false); router.push(route); } catch (value) { setError(value instanceof Error ? value.message : "The workflow item could not be opened."); } };
  const dismiss = async (item: PrimeHrNotification) => { try { const value = await primeHrNotifications.dismiss(item); setItems(current => current.filter(row => row.id !== value.id)); if (!item.readAt) setUnread(current => Math.max(0, current - 1)); } catch (value) { setError(value instanceof Error ? value.message : "The notification could not be dismissed."); } };
  const readAll = async () => { try { await primeHrNotifications.readAll(); setUnread(0); await load(); } catch (value) { setError(value instanceof Error ? value.message : "Notifications could not be marked read."); } };
  const count = unread + warnings.length + discrepancies.length;

  const content = <><div className={styles.header}><div><h2>{full ? "My Notifications" : "Notifications"}</h2>{full && <p>PRIME-HRM updates and real Employee Portal account warnings.</p>}</div><div className={styles.actions}><button type="button" onClick={() => void load()}>Refresh</button>{unread > 0 && <button type="button" onClick={() => void readAll()}>Mark PRIME-HRM read</button>}</div></div>{full && <div className={styles.filters}><button className={!unreadOnly ? styles.selected : ""} type="button" onClick={() => setUnreadOnly(false)}>All</button><button className={unreadOnly ? styles.selected : ""} type="button" onClick={() => setUnreadOnly(true)}>Unread</button></div>}{(warnings.length > 0 || discrepancies.length > 0) && <section className={styles.signals} aria-label="Employee Portal alerts"><strong>Employee Portal alerts</strong>{warnings.map(warning => <div className={styles.signal} key={warning.id}><b>{warning.title}</b><span>{warning.message}</span></div>)}{discrepancies.map((row, index) => <div className={styles.signal} key={row.groupRequestId ?? index}><b>Staff Overtime Discrepancy</b><button type="button" onClick={() => router.push("/employee-portal/selfservice/OvertimeRequest")}>{row.groupDiscrepancySummary}</button></div>)}</section>}{error && <div className={`${styles.message} ${styles.error}`} role="alert">{error}</div>}{loading ? <div className={styles.message}>Loading notifications…</div> : items.length === 0 ? <div className={styles.message}>No {unreadOnly ? "unread " : ""}PRIME-HRM notifications.</div> : <div className={styles.list}>{items.map(item => <article className={`${styles.item} ${!item.readAt ? styles.unread : ""} ${item.actionState === "CLOSED" ? styles.closed : ""}`} key={item.id}><div className={styles.itemHeader}><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div><p>{item.message}</p><div className={styles.meta}><span>{item.sourceDomain.replaceAll("_", " ")}</span><span>{item.kind === "ACTION_REQUIRED" ? item.actionState : "UPDATE"}</span>{item.dueAt && <span>Due {new Date(item.dueAt).toLocaleString()}</span>}</div><div className={styles.itemActions}><button className={styles.open} type="button" onClick={() => void view(item)}>Open</button>{item.kind === "INFORMATIONAL" && <button className={styles.dismiss} type="button" onClick={() => void dismiss(item)}>Dismiss</button>}</div></article>)}</div>}{!full && <Link className={styles.more} href="/employee-portal/notifications" onClick={() => setOpen(false)}>View all notifications</Link>}</>;
  if (full) return <section className={styles.page}>{content}</section>;
  return <div className={styles.wrapper} ref={ref}><button className={styles.bell} type="button" aria-label={`Notifications${count ? ` (${count})` : ""}`} aria-expanded={open} onClick={() => setOpen(value => !value)}><FiBell />{count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}</button>{open && <div className={styles.panel}>{content}</div>}</div>;
}
