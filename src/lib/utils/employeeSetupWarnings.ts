import { fetchWithAuth } from "./fetchWithAuth";
import { runtimeConfig } from "./runtimeConfig";
import { loadPortalPermissions } from "./portalPermissions";

export interface EmployeeSetupWarning {
  id: "missing-role" | "default-password" | "missing-designation" | "missing-beginning-balance";
  title: string;
  message: string;
}

interface PersonnelEntry {
  employeeId: number;
  businessUnitId: number | null;
  areaId: number | null;
  base: string | null;
}

interface BeginningBalanceEntry {
  leaveBeginningBalanceId: number | null;
}

interface CurrentLeaveBalance {
  lastProcessedPeriodEnd?: string | null;
}

type LoadResult<T> = { ok: true; data: T } | { ok: false };

const requestCache = new Map<number, Promise<EmployeeSetupWarning[]>>();

export const clearEmployeeSetupWarnings = (): void => {
  requestCache.clear();
};

const loadJson = async <T>(url: string): Promise<LoadResult<T>> => {
  try {
    const response = await fetchWithAuth(url);
    if (!response.ok) return { ok: false };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false };
  }
};

const hasPositiveId = (value: number | null): boolean =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const loadWarnings = async (
  employeeId: number,
  forceRefresh = false,
): Promise<EmployeeSetupWarning[]> => {
  const administrativeApi = runtimeConfig.getApiUrl("administrative");
  const hrmApi = runtimeConfig.getApiUrl("hrm");

  const [permissions, personnelResult, beginningBalanceResult, currentBalanceResult] =
    await Promise.all([
      loadPortalPermissions(forceRefresh),
      loadJson<PersonnelEntry[]>(`${administrativeApi}/api/manage-personnel/get-all`),
      loadJson<BeginningBalanceEntry[]>(
        `${hrmApi}/api/leave-beginning-balance/get-all/${employeeId}`,
      ),
      loadJson<CurrentLeaveBalance>(
        `${hrmApi}/api/leave-balance/current/${employeeId}`,
      ),
    ]);

  const warnings: EmployeeSetupWarning[] = [];

  if (permissions.loaded && !permissions.hasAssignedRole) {
    warnings.push({
      id: "missing-role",
      title: "User Role Required",
      message:
        "No user role has been assigned to your account. Portal access is limited to the Dashboard until HR assigns your Role in Employment Record and an administrator configures that role in Permission.",
    });
  }

  if (permissions.usingDefaultPassword === true) {
    warnings.push({
      id: "default-password",
      title: "Change Your Default Password",
      message:
        "You are still using your birth date as your default password. Please use Change Password as soon as possible to secure your account.",
    });
  }

  if (personnelResult.ok && Array.isArray(personnelResult.data)) {
    const hasValidBaseAssignment = personnelResult.data.some(
      (entry) =>
        Number(entry.employeeId) === employeeId &&
        entry.base?.trim().toLowerCase() === "yes" &&
        hasPositiveId(entry.areaId) &&
        hasPositiveId(entry.businessUnitId),
    );

    if (!hasValidBaseAssignment) {
      warnings.push({
        id: "missing-designation",
        title: "Designated Area Required",
        message:
          "Your designated Area and main Business Unit have not yet been configured. Please contact HR or your system administrator.",
      });
    }
  }

  // A zero balance is valid. Warn only when there is neither a saved opening
  // record nor an already-processed leave-card period. If either request fails,
  // do not turn an unavailable check into a false setup warning.
  if (
    beginningBalanceResult.ok &&
    currentBalanceResult.ok &&
    Array.isArray(beginningBalanceResult.data) &&
    beginningBalanceResult.data.length === 0 &&
    !currentBalanceResult.data.lastProcessedPeriodEnd
  ) {
    warnings.push({
      id: "missing-beginning-balance",
      title: "Leave Beginning Balance Required",
      message:
        "Your leave beginning balance has not yet been configured. Please contact HR to have your beginning balance recorded.",
    });
  }

  return warnings;
};

export const getEmployeeSetupWarnings = (
  employeeId: number,
  forceRefresh = false,
): Promise<EmployeeSetupWarning[]> => {
  if (forceRefresh) requestCache.delete(employeeId);
  const cached = requestCache.get(employeeId);
  if (cached) return cached;

  const request = loadWarnings(employeeId, forceRefresh);
  requestCache.set(employeeId, request);
  return request;
};
