// Use localStorage for now
// Later, you can update this file to use cookies instead (e.g., using js-cookie or let the backend handle it entirely).

import { Employee } from "@/lib/types/Employee";

export const localStorageUtil = {
  // Token
  get: () => localStorage.getItem("authToken"),
  set: (token: string) => localStorage.setItem("authToken", token),
  clear: () => localStorage.removeItem("authToken"),

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
  },

  setEmployeeRole: (userRole: string) => localStorage.setItem("userRole", userRole),
  getEmployeeRole: () => localStorage.getItem("userRole"),

  setEmployeeId: (employeeId: number) => localStorage.setItem("employeeId", employeeId.toString()),
  getEmployeeId: (): number | null => {
    const id = localStorage.getItem("employeeId");
    return id ? Number(id) : null;
  },

  setBiometricNo: (biometricNo: string) => localStorage.setItem("biometricNo", biometricNo),
  getBiometricNo: () => localStorage.getItem("biometricNo"),
};