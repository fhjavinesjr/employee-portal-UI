"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import { loadPortalPermissions } from "@/lib/utils/portalPermissions";
import styles from "../MyPerformanceRatings/MyPerformanceRatings.module.scss";

type Candidate = { id: string; employeeName: string; targetPositionName: string; intakeType: string; status: string;
  noticeText: string | null; consentStatement: string | null; eligibilityOutcome: string | null; eligibilityReason: string | null;
  findings: Array<{ id: string; criterionLabel: string; outcome: string; reason: string; employeeVisible: boolean }> };
type Assessment = { id: string; employeeName: string; targetPositionName: string; status: string; recommendedLevelLabel: string | null;
  recommendationNarrative: string | null; decision: null | { outcome: string; readinessLevelLabel: string; employeeVisibleReason: string };
  findings: Array<{ id: string; criterionLabel: string; outcome: string; rationale: string; employeeVisible: boolean }> };
type Plan = { id: string; employeeName: string; targetPositionName: string; status: string; overallGoal: string;
  startsOn: string; targetCompletionDate: string; nextReviewOn: string; acknowledgmentStatus: string;
  milestones: Array<{ id: string; title: string; measurableOutcome: string; dueDate: string; status: string; employeeVisibleFeedback: string | null }>;
  reviews: Array<{ id: string; reviewDate: string; recommendation: string; employeeVisibleSummary: string }>;
  membershipHistory: Array<{ id: string; eventType: string; resultingStatus: string; employeeVisibleReason: string }> };
type Allowed = { pool: boolean; readiness: boolean; development: boolean; report: boolean };
const base = () => `${runtimeConfig.getApiUrl("primehr")}/api/primehr/v1/succession`;
async function json<T>(path: string): Promise<T> { const response = await fetchWithAuth(`${base()}${path}`);
  if (response.ok) return response.json() as Promise<T>; const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  throw new Error(body?.detail ?? body?.message ?? `Career and development request failed (${response.status}).`); }
async function pdf(path: string) { const response = await fetchWithAuth(`${base()}/reports${path}`, { headers: { Accept: "application/pdf" } });
  if (!response.ok) throw new Error(`Unable to open the career and development record (${response.status}).`);
  const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.target = "_blank";
  link.rel = "noopener noreferrer"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }

export default function MyCareerDevelopment() {
  const [allowed, setAllowed] = useState<Allowed>({ pool: false, readiness: false, development: false, report: false });
  const [candidates, setCandidates] = useState<Candidate[]>([]); const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]); const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async (access: Allowed) => { setBusy(true); setMessage(""); try {
    const [candidateValues, assessmentValues, planValues] = await Promise.all([
      access.pool ? json<Candidate[]>("/candidates") : Promise.resolve([]),
      access.readiness ? json<Assessment[]>("/readiness") : Promise.resolve([]),
      access.development ? json<Plan[]>("/development") : Promise.resolve([]),
    ]); setCandidates(candidateValues); setAssessments(assessmentValues); setPlans(planValues);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load career and development records."); }
  finally { setBusy(false); } }, []);
  useEffect(() => { void loadPortalPermissions(true).then(permissions => { const can = (key: string) => permissions.isAdministrator || permissions.permissionData[key]?.canAccess === true;
    const access = { pool: can("primehr.succession-pool"), readiness: can("primehr.succession-readiness"), development: can("primehr.succession-development"), report: can("primehr.succession-report") };
    setAllowed(access); setReady(true); void load(access); }); }, [load]);
  if (!ready) return <div className={styles.page}>Loading My Career and Development...</div>;
  return <div className={styles.page} data-testid="phase9e-my-career"><h1>My Career and Development</h1>
    <p className={styles.lead}>Only your authenticated employee records and employee-visible reasons are shown. Readiness supports development planning and is not a rank, promotion promise, appointment, or salary decision.</p>
    {message && <div className={styles.notice} role="status">{message}</div>}
    {allowed.pool && <section><h2>My succession notices and candidate records</h2>{candidates.length ? candidates.map(candidate => <article className={styles.card} key={candidate.id}>
      <strong>{candidate.status} - {candidate.targetPositionName}</strong><p>{candidate.intakeType}</p>{candidate.noticeText && <div className={styles.summary}>{candidate.noticeText}</div>}
      {candidate.consentStatement && <p>Consent: {candidate.consentStatement}</p>}{candidate.eligibilityOutcome && <p>Eligibility: {candidate.eligibilityOutcome} - {candidate.eligibilityReason}</p>}
      {candidate.findings.filter(finding => finding.employeeVisible).map(finding => <p key={finding.id}>{finding.criterionLabel}: {finding.outcome} - {finding.reason}</p>)}</article>) : <p>No succession notice or candidate record is visible to your account.</p>}</section>}
    {allowed.readiness && <section><h2>My readiness outcomes</h2>{assessments.length ? assessments.map(assessment => <article className={styles.card} key={assessment.id}>
      <strong>{assessment.status} - {assessment.targetPositionName}</strong>{assessment.recommendedLevelLabel && <p>Human recommendation: {assessment.recommendedLevelLabel}</p>}
      {assessment.decision && <p>Authorized outcome: {assessment.decision.outcome} - {assessment.decision.employeeVisibleReason}</p>}
      {allowed.report && <button disabled={busy} onClick={() => void pdf(`/readiness/${assessment.id}.pdf`)}>Print readiness summary</button>}</article>) : <p>No readiness outcome is visible to your account.</p>}</section>}
    {allowed.development && <section><h2>My succession development plans</h2>{plans.length ? plans.map(plan => <article className={styles.card} key={plan.id}>
      <strong>{plan.status} - {plan.targetPositionName}</strong><p>{plan.overallGoal}</p><p>{plan.startsOn} to {plan.targetCompletionDate}; next review {plan.nextReviewOn}</p>
      <p>Acknowledgment: {plan.acknowledgmentStatus}</p>{plan.milestones.map(milestone => <p key={milestone.id}>{milestone.title}: {milestone.status} - due {milestone.dueDate}</p>)}
      {plan.reviews.map(review => <div className={styles.summary} key={review.id}>{review.reviewDate}: {review.recommendation} - {review.employeeVisibleSummary}</div>)}
      {plan.membershipHistory.map(event => <p key={event.id}>Pool status: {event.resultingStatus} - {event.employeeVisibleReason}</p>)}
      {allowed.report && <button disabled={busy} onClick={() => void pdf(`/development/${plan.id}.pdf`)}>Print development plan</button>}</article>) : <p>No succession development plan is visible to your account.</p>}</section>}
  </div>;
}
