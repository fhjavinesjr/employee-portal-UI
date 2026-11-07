"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { loadPortalPermissions } from "@/lib/utils/portalPermissions";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import styles from "../MyPerformanceRatings/MyPerformanceRatings.module.scss";

type Need = { id: string; developmentObjective: string; priority: string; targetDate: string | null; status: string };
type Idp = { id: string; planningYear: number; overallGoal: string; status: string; items: Array<{ id: string; developmentObjective: string; interventionCategory: string; successMeasure: string }> };
type Nomination = { id: string; recordVersion: number; offeringTitle: string; scheduleStart: string; scheduleEnd: string; sourceType: string; status: string };
type Enrollment = { id: string; recordVersion: number; offeringId: string; status: string; statusReason: string | null };
type Completion = { id: string; recordVersion: number; offeringId: string; plannedHours: number; creditedHours: number; status: string; completionDate: string | null; outputs: Array<{ id: string; title: string; status: string }>; evidence: Array<{ id: string; filename: string; evidenceType: string }> };
type Result = { id: string; recordVersion: number; score: number | null; narrative: string; status: string; decisionReason: string | null };
type Task = { id: string; recordVersion: number; completionCaseId: string; levelType: string; evaluatorRole: string; assignedEvaluatorNo: string; dueDate: string; status: string; scoreMethod: "QUALITATIVE" | "PERCENTAGE" | "POINTS" | "PASS_FAIL"; passingScore: number | null; instrumentGuidance: string; currentResultId: string | null; results: Result[] };
type ActionPlan = { id: string; recordVersion: number; completionCaseId: string; supervisorEmployeeNo: string; applicationObjective: string; successMeasure: string; targetDate: string; status: string; followUpOutcome: string | null; decisionReason: string | null };
type Allowed = { needs: boolean; idp: boolean; nomination: boolean; evaluation: boolean; reports: boolean };

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithAuth(`${runtimeConfig.getApiUrl("primehr")}/api/primehr/v1/learning-development${path}`, init);
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  throw new Error(body?.detail ?? body?.message ?? `L&D request failed (${response.status}).`);
}

async function openPdf(path: string): Promise<void> {
  const response = await fetchWithAuth(`${runtimeConfig.getApiUrl("primehr")}/api/primehr/v1/learning-development/reports${path}`, { headers: { Accept: "application/pdf" } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
    throw new Error(body?.detail ?? body?.message ?? `Report request failed (${response.status}).`);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
  document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function MyLearning() {
  const [allowed, setAllowed] = useState<Allowed>({ needs: false, idp: false, nomination: false, evaluation: false, reports: false });
  const [needs, setNeeds] = useState<Need[]>([]); const [idps, setIdps] = useState<Idp[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]); const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]); const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]); const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  const load = useCallback(async (access: Allowed) => {
    setError("");
    try {
      const [needRows, idpRows, nominationRows, enrollmentRows, completionRows, taskRows, planRows] = await Promise.all([
        access.needs ? json<Need[]>("/needs") : Promise.resolve([]),
        access.idp ? json<Idp[]>("/individual-plans") : Promise.resolve([]),
        access.nomination ? json<Nomination[]>("/nominations") : Promise.resolve([]),
        access.nomination ? json<Enrollment[]>("/enrollments") : Promise.resolve([]),
        access.nomination ? json<Completion[]>("/completion-cases/mine") : Promise.resolve([]),
        access.evaluation ? json<Task[]>("/evaluation/tasks/mine") : Promise.resolve([]),
        access.evaluation ? json<ActionPlan[]>("/evaluation/action-plans/mine") : Promise.resolve([]),
      ]);
      setNeeds(needRows); setIdps(idpRows); setNominations(nominationRows); setEnrollments(enrollmentRows);
      setCompletions(completionRows); setTasks(taskRows); setPlans(planRows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load My Learning."); }
  }, []);

  useEffect(() => { void loadPortalPermissions(true).then(permission => {
    const can = (key: string) => permission.isAdministrator || permission.permissionData[key]?.canAccess === true;
    const access = { needs: can("primehr.ld-needs"), idp: can("primehr.ld-individual-plan"),
      nomination: can("primehr.ld-nomination"), evaluation: can("primehr.ld-evaluation"), reports: can("primehr.ld-report") };
    setAllowed(access); setReady(true); void load(access);
  }); }, [load]);

  async function enrollmentAction(row: Enrollment, action: "confirm" | "decline") {
    const reason = action === "decline" ? await Swal.fire({ title: "Decline invitation", input: "textarea",
      inputLabel: "Reason", showCancelButton: true, inputValidator: value => value.trim() ? undefined : "Reason is required." }) :
      await Swal.fire({ title: "Confirm participation?", icon: "question", showCancelButton: true });
    if (!reason.isConfirmed) return;
    await mutate(`/enrollments/${row.id}/${action}`, { recordVersion: row.recordVersion,
      reason: action === "decline" ? String(reason.value).trim() : null }, "Participation response saved.");
  }

  async function submitTask(task: Task) {
    const numeric = task.scoreMethod === "PERCENTAGE" || task.scoreMethod === "POINTS";
    const passFail = task.scoreMethod === "PASS_FAIL";
    const scoreControl = numeric ? '<label for="myLearningScore">Score</label><input id="myLearningScore" type="number" min="0" step="0.000001" class="swal2-input">' : "";
    const passedControl = passFail ? '<label for="myLearningPassed">Result</label><select id="myLearningPassed" class="swal2-select"><option value="">Select result</option><option value="true">Passed</option><option value="false">Not passed</option></select>' : "";
    const response = await Swal.fire({ title: `${task.levelType} evaluation`,
      html: `${scoreControl}${passedControl}<label for="myLearningNarrative">Narrative</label><textarea id="myLearningNarrative" class="swal2-textarea"></textarea><label for="myLearningEvidence">Evidence reference (optional)</label><input id="myLearningEvidence" class="swal2-input">`,
      showCancelButton: true, preConfirm: () => { const narrative = (document.getElementById("myLearningNarrative") as HTMLTextAreaElement | null)?.value.trim();
        const score = (document.getElementById("myLearningScore") as HTMLInputElement | null)?.value;
        const passed = (document.getElementById("myLearningPassed") as HTMLSelectElement | null)?.value;
        if (!narrative) return Swal.showValidationMessage("Narrative is required.");
        if (numeric && !score) return Swal.showValidationMessage("A numeric score is required for this instrument.");
        if (passFail && !passed) return Swal.showValidationMessage("Select Passed or Not passed.");
        return { narrative, score: score ? Number(score) : null, passed: passFail ? passed === "true" : null,
          evidenceReference: (document.getElementById("myLearningEvidence") as HTMLInputElement | null)?.value.trim() || null }; } });
    if (!response.isConfirmed) return;
    await mutate(`/evaluation/tasks/${task.id}/results`, { taskRecordVersion: task.recordVersion, ...response.value }, "Evaluation submitted.");
  }

  async function createPlan(completion: Completion) {
    const supervisor = tasks.find(task => task.completionCaseId === completion.id && task.evaluatorRole === "SUPERVISOR")?.assignedEvaluatorNo;
    if (!supervisor) { setError("A supervisor evaluation assignment is required before creating the learning action plan."); return; }
    const response = await Swal.fire({ title: "Create learning action plan",
      html: '<label for="lapObjective">Application objective</label><textarea id="lapObjective" class="swal2-textarea"></textarea><label for="lapMeasure">Success measure</label><textarea id="lapMeasure" class="swal2-textarea"></textarea><label for="lapDate">Target date</label><input id="lapDate" type="date" class="swal2-input">',
      showCancelButton: true, preConfirm: () => { const applicationObjective = (document.getElementById("lapObjective") as HTMLTextAreaElement | null)?.value.trim();
        const successMeasure = (document.getElementById("lapMeasure") as HTMLTextAreaElement | null)?.value.trim();
        const targetDate = (document.getElementById("lapDate") as HTMLInputElement | null)?.value;
        if (!applicationObjective || !successMeasure || !targetDate) return Swal.showValidationMessage("Objective, measure, and target date are required.");
        return { applicationObjective, successMeasure, targetDate }; } });
    if (!response.isConfirmed) return;
    await mutate(`/evaluation/completion-cases/${completion.id}/action-plan`, { completionRecordVersion: completion.recordVersion,
      supervisorEmployeeNo: supervisor, ...response.value }, "Learning action plan created.");
  }

  async function submitPlan(plan: ActionPlan) {
    const response = await Swal.fire({ title: "Submit action plan?", icon: "question", showCancelButton: true });
    if (response.isConfirmed) await mutate(`/evaluation/action-plans/${plan.id}/submit`, { recordVersion: plan.recordVersion, reason: null }, "Action plan submitted.");
  }

  async function uploadEvidence(completion: Completion) {
    const response = await Swal.fire({ title: "Upload completion evidence", html: '<label for="ldEvidenceType">Evidence type</label><select id="ldEvidenceType" class="swal2-select"><option>OUTPUT</option><option>CERTIFICATE</option><option>ATTENDANCE</option><option>OTHER</option></select><label for="ldEvidenceFile">PDF, PNG, or JPEG</label><input id="ldEvidenceFile" type="file" accept="application/pdf,image/png,image/jpeg" class="swal2-file">',
      showCancelButton: true, preConfirm: () => { const file = (document.getElementById("ldEvidenceFile") as HTMLInputElement | null)?.files?.[0];
        const evidenceType = (document.getElementById("ldEvidenceType") as HTMLSelectElement | null)?.value;
        if (!file) return Swal.showValidationMessage("Select an evidence file."); return { file, evidenceType }; } });
    if (!response.isConfirmed || !response.value) return;
    const form = new FormData(); form.append("file", response.value.file); form.append("evidenceType", response.value.evidenceType ?? "OTHER");
    setBusy(true); setError(""); try { await json(`/completion-cases/${completion.id}/evidence/mine`, { method: "POST", body: form });
      setNotice("Evidence uploaded."); await load(allowed); } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed."); } finally { setBusy(false); }
  }

  async function mutate(path: string, body: object, success: string) {
    setBusy(true); setError(""); try { await json(path, { method: "POST", body: JSON.stringify(body) });
      setNotice(success); await load(allowed); } catch (reason) { setError(reason instanceof Error ? reason.message : "The request failed."); } finally { setBusy(false); }
  }

  async function print(path: string) {
    setBusy(true); setError("");
    try { await openPdf(path); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to open the report."); }
    finally { setBusy(false); }
  }

  if (!ready) return <div className={styles.page}>Loading My Learning…</div>;
  if (!Object.values(allowed).some(Boolean)) return <div className={styles.page}><h1>My Learning</h1><div className={styles.error}>Your role does not include a Learning and Development permission.</div></div>;
  return <div className={styles.page} data-testid="phase7e-my-learning"><h1>My Learning</h1><p className={styles.lead}>Your authenticated learning needs, plans, nominations, participation, completion evidence, evaluations, and follow-through are shown here. No employee selector is used.</p>
    {notice && <div className={styles.notice}>{notice}</div>}{error && <div className={styles.error} role="alert">{error}</div>}
    {allowed.needs && <section><h2>My Learning Needs</h2><table className={styles.table}><thead><tr><th>Objective</th><th>Priority</th><th>Target</th><th>Status</th></tr></thead><tbody>{needs.length ? needs.map(row => <tr key={row.id}><td>{row.developmentObjective}</td><td>{row.priority}</td><td>{row.targetDate ?? "—"}</td><td>{row.status}</td></tr>) : <tr><td colSpan={4}>No learning needs.</td></tr>}</tbody></table></section>}
    {allowed.idp && <section><h2>My Individual Development Plans</h2>{idps.length ? idps.map(row => <article className={styles.card} key={row.id}><strong>{row.planningYear} · {row.status}</strong><p>{row.overallGoal}</p>{row.items.map(item => <div className={styles.summary} key={item.id}>{item.developmentObjective}<br />{item.interventionCategory} · {item.successMeasure}</div>)}{allowed.reports && row.status === "APPROVED" && <button disabled={busy} onClick={() => void print(`/individual-plans/${encodeURIComponent(row.id)}.pdf`)}>Print approved IDP</button>}</article>) : <p>No individual development plans.</p>}</section>}
    {allowed.nomination && <section><h2>My Nominations and Participation</h2><table className={styles.table}><thead><tr><th>Offering</th><th>Schedule / source</th><th>Status</th></tr></thead><tbody>{nominations.length ? nominations.map(row => <tr key={row.id}><td>{row.offeringTitle}</td><td>{row.scheduleStart} to {row.scheduleEnd}<br />{row.sourceType}</td><td>{row.status}</td></tr>) : <tr><td colSpan={3}>No nominations.</td></tr>}</tbody></table>{enrollments.map(row => <article className={styles.card} key={row.id}><strong>Offering {row.offeringId} · {row.status}</strong>{row.statusReason && <p>{row.statusReason}</p>}{row.status === "INVITED" && <div className={styles.actions}><button disabled={busy} onClick={() => void enrollmentAction(row,"confirm")}>Confirm</button><button disabled={busy} className={styles.danger} onClick={() => void enrollmentAction(row,"decline")}>Decline</button></div>}</article>)}</section>}
    {allowed.nomination && <section><h2>Completion and Evidence</h2>{completions.length ? completions.map(row => <article className={styles.card} key={row.id}><strong>{row.status} · {row.creditedHours}/{row.plannedHours} credited hours</strong><p>Offering {row.offeringId}{row.completionDate ? ` · completed ${row.completionDate}` : ""}</p><div className={styles.actions}><button disabled={busy} onClick={() => void uploadEvidence(row)}>Upload evidence</button>{allowed.reports && row.status === "COMPLETED" && <button disabled={busy} onClick={() => void print(`/completion-cases/${encodeURIComponent(row.id)}.pdf`)}>Print completion packet</button>}{allowed.evaluation && !plans.some(plan => plan.completionCaseId === row.id) && row.status === "COMPLETED" && <button disabled={busy} onClick={() => void createPlan(row)}>Create action plan</button>}</div>{row.outputs.map(output => <div className={styles.summary} key={output.id}>{output.title} · {output.status}</div>)}</article>) : <p>No completion record.</p>}</section>}
    {allowed.evaluation && <section><h2>My Evaluation Tasks</h2>{tasks.length ? tasks.map(task => <article className={styles.card} key={task.id}><strong>{task.levelType} · {task.status}</strong><p>Due {task.dueDate} · {task.instrumentGuidance}</p>{task.results.map(result => <div className={styles.summary} key={result.id}>{result.status} · {result.score ?? "No numeric score"}<br />{result.narrative}{result.decisionReason ? ` · ${result.decisionReason}` : ""}</div>)}{task.status === "OPEN" && <button disabled={busy} onClick={() => void submitTask(task)}>Complete evaluation</button>}</article>) : <p>No evaluation tasks.</p>}</section>}
    {allowed.evaluation && <section><h2>My Learning Action Plans</h2>{plans.length ? plans.map(plan => <article className={styles.card} key={plan.id}><strong>{plan.status} · target {plan.targetDate}</strong><p>{plan.applicationObjective}</p><p>{plan.successMeasure}</p>{plan.followUpOutcome && <div className={styles.summary}>{plan.followUpOutcome}</div>}{(plan.status === "DRAFT" || plan.status === "RETURNED") && <button disabled={busy} onClick={() => void submitPlan(plan)}>Submit to supervisor</button>}</article>) : <p>No learning action plan.</p>}</section>}
  </div>;
}
