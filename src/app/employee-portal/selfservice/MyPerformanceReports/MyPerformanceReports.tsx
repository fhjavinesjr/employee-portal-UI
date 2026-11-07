"use client";

import { useEffect, useState } from "react";
import { loadPortalPermissions } from "@/lib/utils/portalPermissions";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import { openPerformanceReport } from "@/lib/services/performanceReports";
import styles from "../MyPerformanceRatings/MyPerformanceRatings.module.scss";

type Commitment = { id: string; formLabel: string; periodStart: string; periodEnd: string; status: string };
type Monitoring = { id: string; formType: string; status: string };
type Coaching = { id: string; sessionAt: string; agenda: string; status: string };
type FinalRating = { id: string; revisionNo: number; roundedScore: number; ratingLabel: string; finalizedAt: string };
type Intervention = { id: string; action: string; status: string; startsOn: string | null; endsOn: string | null };

async function json<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(`${runtimeConfig.getApiUrl("primehr")}${path}`);
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  throw new Error(body?.detail ?? body?.message ?? `Request failed (${response.status}).`);
}

export default function MyPerformanceReports() {
  const [data, setData] = useState<{ commitments: Commitment[]; monitoring: Monitoring[]; ratings: FinalRating[]; interventions: Intervention[] }>({ commitments: [], monitoring: [], ratings: [], interventions: [] });
  const [sessions, setSessions] = useState<Record<string, Coaching[]>>({}); const [allowed, setAllowed] = useState({ form: false, monitoring: false });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { void loadPortalPermissions(true).then(async permission => { const administrator = permission.isAdministrator;
    const form = administrator || permission.permissionData["primehr.performance-form-report"]?.canAccess === true;
    const monitoring = administrator || permission.permissionData["primehr.performance-monitoring-report"]?.canAccess === true;
    const commitments = administrator || permission.permissionData["primehr.individual-performance-commitment"]?.canAccess === true;
    const monitoringWorkflow = administrator || permission.permissionData["primehr.performance-monitoring"]?.canAccess === true;
    const rating = administrator || permission.permissionData["primehr.performance-rating"]?.canAccess === true;
    const intervention = administrator || permission.permissionData["primehr.performance-intervention"]?.canAccess === true;
    setAllowed({ form, monitoring }); try { const [commitmentRows, monitoringRows, ratingRows, interventionRows] = await Promise.all([
      form && commitments ? json<Commitment[]>("/api/primehr/v1/performance-management/commitments/mine?formType=IPCR") : Promise.resolve([]),
      monitoring && monitoringWorkflow ? json<Monitoring[]>("/api/primehr/v1/performance-management/monitoring-cases/mine") : Promise.resolve([]),
      form && rating ? json<FinalRating[]>("/api/primehr/v1/performance-management/final-ratings/mine") : Promise.resolve([]),
      monitoring && intervention ? json<Intervention[]>("/api/primehr/v1/performance-management/interventions/mine") : Promise.resolve([]),
    ]); setData({ commitments: commitmentRows, monitoring: monitoringRows, ratings: ratingRows, interventions: interventionRows }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load your performance reports."); } }); }, []);
  async function open(path: string) { setBusy(true); setError(""); try { await openPerformanceReport(path); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to open the report."); } finally { setBusy(false); } }
  async function showSessions(caseId: string) { setBusy(true); setError(""); try { setSessions({ ...sessions, [caseId]: await json(`/api/primehr/v1/performance-management/monitoring-cases/${encodeURIComponent(caseId)}/coaching-sessions`) }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load coaching sessions."); } finally { setBusy(false); } }
  if (!allowed.form && !allowed.monitoring) return <div className={styles.page}><h1>My Performance Reports</h1><div className={styles.error}>Your role does not include a performance report permission.</div></div>;
  return <div className={styles.page} data-testid="phase6f4-my-performance-reports"><h1>My Performance Reports</h1><p className={styles.lead}>Only report records owned by your authenticated account are listed. Reports open from server-validated final source revisions.</p>{error && <div className={styles.error} role="alert">{error}</div>}
    {allowed.form && <section><h2>Planning and rated forms</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Record</th><th>Period / result</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.commitments.filter(row => row.status === "APPROVED").map(row => <tr key={row.id}><td>{row.formLabel}</td><td>{row.periodStart} to {row.periodEnd}</td><td>{row.status}</td><td><button disabled={busy} onClick={() => void open(`/api/primehr/v1/performance-management/reports/commitments/${encodeURIComponent(row.id)}.pdf`)}>Open planning form</button></td></tr>)}{data.ratings.map(row => <tr key={row.id}><td>Final rating revision {row.revisionNo}</td><td>{row.roundedScore} · {row.ratingLabel}</td><td>{row.finalizedAt}</td><td><button disabled={busy} onClick={() => void open(`/api/primehr/v1/performance-management/reports/final-ratings/${encodeURIComponent(row.id)}.pdf`)}>Open rated form</button></td></tr>)}{!data.commitments.some(row => row.status === "APPROVED") && data.ratings.length === 0 && <tr><td colSpan={4}>No eligible planning or rated form is available.</td></tr>}</tbody></table></div></section>}
    {allowed.monitoring && <section><h2>Monitoring and coaching</h2>{data.monitoring.length ? data.monitoring.map(row => <article className={styles.card} key={row.id}><strong>{row.formType} · {row.status}</strong><div className={styles.actions}><button disabled={busy} onClick={() => void open(`/api/primehr/v1/performance-management/reports/monitoring/${encodeURIComponent(row.id)}.pdf`)}>Open monitoring report</button><button disabled={busy} onClick={() => void showSessions(row.id)}>Show coaching sessions</button></div>{sessions[row.id]?.map(session => <div className={styles.summary} key={session.id}>{session.sessionAt} · {session.agenda} · {session.status}<button disabled={busy} onClick={() => void open(`/api/primehr/v1/performance-management/reports/coaching/${encodeURIComponent(session.id)}.pdf`)}>Open coaching report</button></div>)}</article>) : <p>No eligible monitoring record is available.</p>}</section>}
    {allowed.monitoring && <section><h2>Development and intervention plans</h2>{data.interventions.length ? data.interventions.map(row => <article className={styles.card} key={row.id}><strong>{row.action} · {row.status}</strong><p>{row.startsOn ?? "—"} to {row.endsOn ?? "—"}</p><div className={styles.actions}><button disabled={busy} onClick={() => void open(`/api/primehr/v1/performance-management/reports/development-plans/${encodeURIComponent(row.id)}.pdf`)}>Open development plan</button><button disabled={busy} onClick={() => void open(`/api/primehr/v1/performance-management/reports/interventions/${encodeURIComponent(row.id)}.pdf`)}>Open intervention report</button></div></article>) : <p>No eligible development or intervention plan is available.</p>}</section>}
  </div>;
}
