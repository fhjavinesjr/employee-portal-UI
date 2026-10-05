import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";

export type SalnStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "FOR_CORRECTION" | "RESUBMITTED" | "COMPLIANT" | "LOCKED" | "VOIDED";
export type FilingType = "ASSUMPTION" | "ANNUAL" | "SEPARATION";
export type FilingMode = "JOINT" | "SEPARATE" | "NOT_APPLICABLE";
export type OwnerType = "DECLARANT" | "SPOUSE" | "CHILD";
export type Money = string | number;

export interface DependentItem { name: string; relationship: string; age: number; }
export interface RealPropertyItem { ownerType: OwnerType; ownerName: string; description: string; kind: string; exactLocation: string; assessedValue: Money; fairMarketValue: Money; acquisitionYear: number; acquisitionMode: string; acquisitionCost: Money; }
export interface PersonalPropertyItem { ownerType: OwnerType; ownerName: string; description: string; acquisitionYear: number; acquisitionCost: Money; }
export interface LiabilityItem { ownerType: OwnerType; ownerName: string; nature: string; creditorName: string; outstandingBalance: Money; }
export interface BusinessInterestItem { ownerType: OwnerType; ownerName: string; entityName: string; businessAddress: string; nature: string; dateAcquired: string; }
export interface GovernmentRelativeItem { name: string; relationship: string; position: string; agencyOfficeAddress: string; }

export interface SalnDraft {
  filingType: FilingType; salnYear: number; referenceDate: string;
  declarantMiddleInitial: string; declarantPosition: string; declarantAgencyOffice: string; declarantOfficeAddress: string;
  spouseFullName: string; spousePosition: string; spouseAgencyOffice: string; spouseOfficeAddress: string;
  filingMode: FilingMode; multipleSpouses: string; businessInterestsNone: boolean; relativesInGovernmentNone: boolean;
  certificationAccepted: boolean; governmentIdType: string; governmentIdNo: string; governmentIdDateIssued: string;
  dependents: DependentItem[]; realProperties: RealPropertyItem[]; personalProperties: PersonalPropertyItem[];
  liabilities: LiabilityItem[]; businessInterests: BusinessInterestItem[]; governmentRelatives: GovernmentRelativeItem[]; remarks: string;
}

export interface SalnTotals { realProperties: Money; personalProperties: Money; totalAssets: Money; totalLiabilities: Money; netWorth: Money; }
export interface SalnRecord extends SalnDraft { id: number; employeeId: number; employeeNo: string; status: SalnStatus; sourceType: string; versionNo: number; asOfDate: string; dueDate: string; submissionDate?: string | null; declarantFamilyName: string; declarantFirstName: string; totals: SalnTotals; }
export interface SalnSummary { id: number; employeeNo: string; employeeName: string; filingType: FilingType; salnYear: number; dueDate: string; submissionDate?: string | null; status: SalnStatus; sourceType: string; versionNo: number; totalAssets: Money; totalLiabilities: Money; netWorth: Money; }
export interface SalnCorrection { id: number; section?: string; field?: string; message: string; requestedBy: string; requestedAt: string; resolved: boolean; }

const base = () => `${runtimeConfig.getApiUrl("hrm")}/api/saln`;
const errorMessage = async (response: Response): Promise<string> => {
  const body = await response.json().catch(() => null) as { detail?: string; message?: string; error?: string } | null;
  return body?.detail ?? body?.message ?? body?.error ?? `Request failed (${response.status})`;
};
const json = async <T>(response: Response): Promise<T> => { if (!response.ok) throw new Error(await errorMessage(response)); return response.json() as Promise<T>; };

export const salnApi = {
  list: () => fetchWithAuth(`${base()}/my`).then((r) => json<SalnSummary[]>(r)),
  get: (id: number) => fetchWithAuth(`${base()}/my/${id}`).then((r) => json<SalnRecord>(r)),
  corrections: (id: number) => fetchWithAuth(`${base()}/my/${id}/corrections`).then((r) => json<SalnCorrection[]>(r)),
  save: (draft: SalnDraft, id?: number) => fetchWithAuth(id ? `${base()}/my/${id}` : `${base()}/my`, { method: id ? "PUT" : "POST", body: JSON.stringify(draft) }).then((r) => json<SalnRecord>(r)),
  submit: (id: number, resubmit: boolean) => fetchWithAuth(`${base()}/my/${id}/${resubmit ? "resubmit" : "submit"}`, { method: "POST" }).then((r) => json<SalnRecord>(r)),
  discard: async (id: number) => { const response = await fetchWithAuth(`${base()}/my/${id}/draft`, { method: "DELETE" }); if (!response.ok) throw new Error(await errorMessage(response)); },
  pdf: async (id: number) => { const response = await fetchWithAuth(`${base()}/my/${id}/pdf`); if (!response.ok) throw new Error(await errorMessage(response)); return response.blob(); },
};

export const newSalnDraft = (): SalnDraft => {
  const year = new Date().getFullYear();
  return { filingType: "ANNUAL", salnYear: year, referenceDate: `${year}-12-31`, declarantMiddleInitial: "", declarantPosition: "", declarantAgencyOffice: "", declarantOfficeAddress: "", spouseFullName: "", spousePosition: "", spouseAgencyOffice: "", spouseOfficeAddress: "", filingMode: "NOT_APPLICABLE", multipleSpouses: "", businessInterestsNone: true, relativesInGovernmentNone: true, certificationAccepted: false, governmentIdType: "", governmentIdNo: "", governmentIdDateIssued: "", dependents: [], realProperties: [], personalProperties: [], liabilities: [], businessInterests: [], governmentRelatives: [], remarks: "" };
};
