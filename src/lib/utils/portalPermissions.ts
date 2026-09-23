import { fetchWithAuth } from "./fetchWithAuth";
import { localStorageUtil, type PortalModuleAccess } from "./localStorageUtil";
import { runtimeConfig } from "./runtimeConfig";

export type PermissionEntry = {
  canAccess?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

type PermissionRuleset = {
  isAdministrator?: boolean | null;
  permissionData?: string | Record<string, PermissionEntry> | null;
  portalModuleAccess?: string | Partial<PortalModuleAccess> | null;
};

export type PortalPermissions = {
  loaded: boolean;
  hasAssignedRole: boolean;
  isAdministrator: boolean;
  usingDefaultPassword: boolean | null;
  permissionData: Record<string, PermissionEntry>;
  portalModuleAccess: PortalModuleAccess;
};

export const NO_PORTAL_MODULE_ACCESS: PortalModuleAccess = {
  administrative: false,
  hrManagement: false,
  timeKeeping: false,
  payroll: false,
  primeHr: false,
};

const ALL_PORTAL_MODULE_ACCESS: PortalModuleAccess = {
  administrative: true,
  hrManagement: true,
  timeKeeping: true,
  payroll: true,
  primeHr: true,
};

const parseObject = <T>(value: string | T | null | undefined): T | null => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
};

const normalizeRole = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized) return null;
  const lowered = normalized.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return null;
  // Personal Data stores the selected Permission ruleset ID. Legacy text
  // values (for example "ADMIN") are not represented by the Role dropdown
  // and therefore are not a current role assignment.
  return /^\d+$/.test(normalized) && Number(normalized) > 0 ? normalized : null;
};

let request: Promise<PortalPermissions> | null = null;
let requestStartedAt = 0;

export const clearPortalPermissions = (): void => {
  request = null;
  requestStartedAt = 0;
  localStorageUtil.clearPortalModuleAccess();
};

export const loadPortalPermissions = (forceRefresh = false): Promise<PortalPermissions> => {
  // Coalesce simultaneous callers, but never keep an authorization decision
  // for the whole browser session. HR may remove a role in another tab.
  if (request && (!forceRefresh || Date.now() - requestStartedAt < 1_000)) return request;

  requestStartedAt = Date.now();
  request = (async () => {
    if (localStorageUtil.getEmployeeNo()?.trim().toLowerCase() === "admin") {
      return {
        loaded: true,
        hasAssignedRole: true,
        isAdministrator: true,
        usingDefaultPassword: false,
        permissionData: {},
        portalModuleAccess: { ...ALL_PORTAL_MODULE_ACCESS },
      };
    }

    try {
      const employeeId = localStorageUtil.getEmployeeId();
      if (!employeeId) {
        throw new Error("The current employee record is unavailable");
      }

      const hrmApi = runtimeConfig.getApiUrl("hrm");
      const [securityResponse, employeeResponse] = await Promise.all([
        fetchWithAuth(`${hrmApi}/api/employee/me/security-status`),
        fetchWithAuth(`${hrmApi}/api/employee/${employeeId}`),
      ]);
      if (!securityResponse.ok || !employeeResponse.ok) {
        throw new Error(`Unable to verify the current employee role (${securityResponse.status})`);
      }
      const securityStatus = (await securityResponse.json()) as {
        usingDefaultPassword?: boolean;
        roleAssigned?: boolean;
        role?: string | null;
      };
      const employeeRecord = (await employeeResponse.json()) as { role?: string | null };
      const currentRole = normalizeRole(employeeRecord.role);

      // This is the same employee record used by HRM Personal Data. It is the
      // authoritative source for the Role dropdown and deliberately overrides
      // older JWT or browser values.
      if (securityStatus.roleAssigned !== true || !currentRole) {
        localStorageUtil.setEmployeeRole(null);
        return {
          loaded: true,
          hasAssignedRole: false,
          isAdministrator: false,
          usingDefaultPassword: securityStatus.usingDefaultPassword === true,
          permissionData: {},
          portalModuleAccess: { ...NO_PORTAL_MODULE_ACCESS },
        };
      }
      localStorageUtil.setEmployeeRole(currentRole);

      const response = await fetchWithAuth(
        `${runtimeConfig.getApiUrl("administrative")}/api/permission/current`,
      );
      if (response.status === 204) {
        return {
          loaded: true,
          hasAssignedRole: false,
          isAdministrator: false,
          usingDefaultPassword: securityStatus.usingDefaultPassword === true,
          permissionData: {},
          portalModuleAccess: { ...NO_PORTAL_MODULE_ACCESS },
        };
      }
      if (!response.ok) throw new Error(`Unable to load permissions (${response.status})`);

      const ruleset = (await response.json()) as PermissionRuleset;
      const isAdministrator = ruleset.isAdministrator === true;
      const permissionData = parseObject<Record<string, PermissionEntry>>(
        ruleset.permissionData,
      ) ?? {};
      const moduleData = parseObject<Partial<PortalModuleAccess>>(
        ruleset.portalModuleAccess,
      ) ?? {};
      const portalModuleAccess = isAdministrator
        ? { ...ALL_PORTAL_MODULE_ACCESS }
        : {
            administrative: moduleData.administrative === true,
            hrManagement: moduleData.hrManagement === true,
            timeKeeping: moduleData.timeKeeping === true,
            payroll: moduleData.payroll === true,
            primeHr: moduleData.primeHr === true,
          };

      return {
        loaded: true,
        hasAssignedRole: true,
        isAdministrator,
        usingDefaultPassword: securityStatus.usingDefaultPassword === true,
        permissionData,
        portalModuleAccess,
      };
    } catch (error) {
      console.error("Unable to load Portal permissions", error);
      return {
        loaded: false,
        hasAssignedRole: false,
        isAdministrator: false,
        usingDefaultPassword: null,
        permissionData: {},
        portalModuleAccess: { ...NO_PORTAL_MODULE_ACCESS },
      };
    }
  })();

  return request;
};

export const canAccessPortalFeature = (
  permissions: PortalPermissions,
  key: string,
): boolean =>
  permissions.hasAssignedRole &&
  (permissions.isAdministrator || permissions.permissionData[key]?.canAccess === true);
