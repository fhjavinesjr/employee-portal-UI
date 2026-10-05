import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";

export type MonitoringCaseItem = { id: string; label: string; outputDescription: string; performanceIndicator: string;
  unitOfMeasure: string; weightPercent: number; required: boolean; requiresEvidence: boolean;
  evidenceRequirement: string | null; committedValue: number | null; committedFrom: number | null;
  committedTo: number | null; targetStart: string | null; targetEnd: string | null; displayOrder: number };
export type MonitoringFeedback = { id: string; decision: string; feedback: string | null; actorEmployeeNo: string; actedAt: string };
export type MonitoringEvidence = { id: string; updateId: string; itemId: string; filename: string; mediaType: string;
  byteSize: number; confidentiality: string; status: string; voidReason: string | null; recordVersion: number };
export type MonitoringUpdate = { id: string; itemId: string; rootUpdateId: string; revisionNo: number; supersedesId: string | null;
  reportingDate: string; narrativeAccomplishment: string; accomplishedValue: number | null; progressPercent: number | null;
  issuesRisks: string | null; supportNeeded: string | null; employeeRemarks: string | null; status: string;
  recordVersion: number; feedback: MonitoringFeedback[]; evidence: MonitoringEvidence[] };
export type MonitoringCase = { id: string; commitmentVersionId: string; formType: string; ownerEmployeeNo: string;
  ownerName: string; supervisorEmployeeNo: string; status: string; accomplishmentRevision: number;
  returnReason: string | null; recordVersion: number; items: MonitoringCaseItem[]; updates: MonitoringUpdate[]; evidence: MonitoringEvidence[] };
export type CoachingActionItem = { id: string; description: string; accountableEmployeeNo: string; dueDate: string;
  status: string; progressNote: string | null; completedAt: string | null; verifiedBy: string | null; reopenReason: string | null; recordVersion: number };
export type CoachingSession = { id: string; revisionNo: number; sessionAt: string; agenda: string; goal: string;
  observedIssue: string; agreedAction: string; resourcesSupport: string | null; actionDueDate: string | null;
  nextMeetingAt: string | null; employeeVisibleFeedback: string | null; privateNotes: null; employeeResponse: string | null;
  status: string; issuedBy: string | null; issuedAt: string | null; acknowledgedAt: string | null;
  recordVersion: number; commitmentItemIds: string[]; actionItems: CoachingActionItem[] };
export type MidCycleReview = { id: string; snapshotUpdateCount: number; snapshotOpenActionCount: number;
  snapshotMissingEvidenceCount: number; supervisorNarrative: string; employeeNarrative: string | null;
  amendmentRecommended: boolean; amendmentReason: string | null; status: string; recordVersion: number };

export class MonitoringApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
const url = (path: string) => `${runtimeConfig.getApiUrl("primehr")}${path}`;
async function responseValue<T>(response: Response): Promise<T> {
  if (response.ok) return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  throw new MonitoringApiError(response.status, body?.detail ?? body?.message ?? `Request failed (${response.status}).`);
}
export const request = <T>(path: string, init: RequestInit = {}) => fetchWithAuth(url(path), init).then(responseValue<T>);
export const listMine = () => request<MonitoringCase[]>("/api/primehr/v1/performance-management/monitoring-cases/mine");
export const getCase = (id: string) => request<MonitoringCase>(`/api/primehr/v1/performance-management/monitoring-cases/${id}`);
export const getSessions = (id: string) => request<CoachingSession[]>(`/api/primehr/v1/performance-management/monitoring-cases/${id}/coaching-sessions`);
export const getReview = (id: string) => request<MidCycleReview>(`/api/primehr/v1/performance-management/monitoring-cases/${id}/mid-cycle-review`);
export const command = <T>(path: string, body: object, method = "POST") => request<T>(path, { method, body: JSON.stringify(body) });
export async function uploadEvidence(updateId: string, file: File): Promise<MonitoringEvidence> { const body = new FormData(); body.append("idempotencyKey", crypto.randomUUID()); body.append("confidentiality", "SENSITIVE"); body.append("file", file); return request(`/api/primehr/v1/performance-management/monitoring-updates/${updateId}/evidence`, { method: "POST", body }); }
export async function downloadEvidence(evidence: MonitoringEvidence): Promise<void> { const response = await fetchWithAuth(url(`/api/primehr/v1/performance-management/monitoring-evidence/${evidence.id}/content`)); if (!response.ok) await responseValue<never>(response); const objectUrl = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = evidence.filename; anchor.click(); URL.revokeObjectURL(objectUrl); }
export function monitoringError(reason: unknown): string { if (reason instanceof MonitoringApiError) { if (reason.status === 403) return "Your permission ruleset does not authorize this action."; if (reason.status === 409) return `This record changed. Reload it before retrying. ${reason.message}`; return reason.message; } return reason instanceof Error ? reason.message : "Unable to complete the request."; }
