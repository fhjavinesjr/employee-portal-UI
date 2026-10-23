import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";

const root = "/api/primehr/v1/performance-management";
const url = (path: string) => `${runtimeConfig.getApiUrl("primehr")}${root}${path}`;
export type ItemActual = { commitmentItemId: string; dimensions: Array<{ dimensionId: string; actualValue: number | null; manualBandId: string | null; narrative: string | null }> };
export type RatingAssessment = { id: string; revisionNo: number; type: string; summary: string | null; rawScore: number; roundedScore: number;
  ratingLabel: string; calculationFingerprint: string; status: string; recordVersion: number };
export type RatingCase = { id: string; formType: string; ownerEmployeeNo: string; supervisorEmployeeNo: string; status: string;
  sourceFingerprint: string; recordVersion: number; sourceItems: Array<{ id: string; commitmentItemId: string; itemLabel: string;
  sectionCode: string; itemWeight: number; accomplishmentNarrative: string; accomplishedValue: number | null; evidenceFingerprint: string | null }>;
  assessments: RatingAssessment[] };
export type FinalRating = { id: string; ratingCaseId: string; revisionNo: number; rawScore: number; roundedScore: number;
  ratingLabel: string; calculationFingerprint: string; finalizedAt: string; recordVersion: number;
  acknowledgment: { status: string; employeeResponse: string | null; actedAt: string; recordVersion: number } | null };
export type Appeal = { id: string; finalRatingId: string; grounds: string; requestedRemedy: string; status: string;
  decisionReason: string | null; successorFinalRatingId: string | null; recordVersion: number;
  evidence: Array<{ id: string; filename: string; mediaType: string; byteSize: number }> };
export type Intervention = { id: string; finalRatingId: string; action: string; status: string; objectives: string | null;
  supportPlan: string | null; accountableEmployeeNo: string | null; startsOn: string | null; endsOn: string | null;
  employeeResponse: string | null; recordVersion: number; checkpoints: Array<{ id: string; dueOn: string; objective: string;
  progressNote: string | null; employeeVisibleFeedback: string | null; privatePmtNote: null; status: string }> };
class RatingApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
async function value<T>(response: Response): Promise<T> { if (response.ok) return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  throw new RatingApiError(response.status, body?.detail ?? body?.message ?? `Request failed (${response.status}).`); }
export const ratingRequest = <T>(path: string, init: RequestInit = {}) => fetchWithAuth(url(path), init).then(value<T>);
export const ratingCommand = <T>(path: string, body: object, method = "POST") => ratingRequest<T>(path, { method, body: JSON.stringify(body) });
export const ratingError = (reason: unknown) => reason instanceof RatingApiError && reason.status === 409
  ? `This record changed. Reload it before retrying. ${reason.message}` : reason instanceof Error ? reason.message : "Unable to complete the request.";
export async function uploadAppealEvidence(appealId: string, file: File) { const body = new FormData(); body.append("idempotencyKey", crypto.randomUUID()); body.append("file", file); return ratingRequest(`/appeals/${appealId}/evidence`, { method: "POST", body }); }
