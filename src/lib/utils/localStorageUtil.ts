// Use localStorage for now
// Later, you can update this file to use cookies instead (e.g., using js-cookie or let the backend handle it entirely).

import { Employee } from "@/lib/types/Employee";

export type PortalModuleAccess = {
  administrative: boolean;
  hrManagement: boolean;
  timeKeeping: boolean;
  payroll: boolean;
};

const isPortalModuleAccess = (value: unknown): value is PortalModuleAccess => {
  if (!value || typeof value !== "object") return false;
  const access = value as Partial<PortalModuleAccess>;
  return (
    typeof access.administrative === "boolean" &&
    typeof access.hrManagement === "boolean" &&
    typeof access.timeKeeping === "boolean" &&
    typeof access.payroll === "boolean"
  );
};

export const localStorageUtil = {
  // Token
  get: () => localStorage.getItem("authToken"),
  set: (token: string) => localStorage.setItem("authToken", token),
  clear: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("portalModuleAccess");
    localStorage.removeItem("portalModuleAccessRole");
  },

  // Employees list
  setEmployees: (employees: Employee[]) => localStorage.setItem("employees", JSON.stringify(employees)),
  getEmployees: (): Employee[] => {
    const data = localStorage.getItem("employees");
    return data ? JSON.parse(data) : [];
  },
  clearEmployees: () => localStorage.removeItem("employees"),

  // Current employeeNo & name
  setEmployeeNo: (employeeNo: string) => localStorage.setItem("employeeNo", employeeNo),
  setEmployeeFullname: (fullname: string) => localStorage.setItem("employeeFullname", fullname),
  getEmployeeNo: () => localStorage.getItem("employeeNo"),
  getEmployeeFullname: () => localStorage.getItem("employeeFullname"),
  clearEmployeeInfo: () => {
    localStorage.removeItem("employeeNo");
    localStorage.removeItem("employeeFullname");
    localStorage.removeItem("portalModuleAccess");
    localStorage.removeItem("portalModuleAccessRole");
  },

  setEmployeeRole: (userRole: string) => localStorage.setItem("userRole", userRole),
  getEmployeeRole: () => localStorage.getItem("userRole"),

  setPortalModuleAccess: (access: PortalModuleAccess, role: string) => {
    localStorage.setItem("portalModuleAccess", JSON.stringify(access));
    localStorage.setItem("portalModuleAccessRole", role);
  },
  getPortalModuleAccess: (role: string): PortalModuleAccess | null => {
    if (localStorage.getItem("portalModuleAccessRole") !== role) return null;
    const data = localStorage.getItem("portalModuleAccess");
    if (!data) return null;
    try {
      const parsed: unknown = JSON.parse(data);
      return isPortalModuleAccess(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  clearPortalModuleAccess: () => {
    localStorage.removeItem("portalModuleAccess");
    localStorage.removeItem("portalModuleAccessRole");
  },

  setEmployeeId: (employeeId: number) => localStorage.setItem("employeeId", employeeId.toString()),
  getEmployeeId: (): number | null => {
    const id = localStorage.getItem("employeeId");
    return id ? Number(id) : null;
  },

  setBiometricNo: (biometricNo: string) => localStorage.setItem("biometricNo", biometricNo),
  getBiometricNo: () => localStorage.getItem("biometricNo"),

  // System configuration (key-value store fetched from backend at login)
  setSystemConfig: (configs: Record<string, string>) => localStorage.setItem("systemConfig", JSON.stringify(configs)),
  getSystemConfig: (key: string): string | null => {
    const data = localStorage.getItem("systemConfig");
    if (!data) return null;
    const parsed: Record<string, string> = JSON.parse(data);
    return parsed[key] ?? null;
  },
  clearSystemConfig: () => localStorage.removeItem("systemConfig"),
};
