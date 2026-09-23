import { AUTH_CONFIG } from "@/lib/utils/authConfig";
import { deleteCookie } from "@/lib/utils/cookies";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { clearPortalPermissions } from "@/lib/utils/portalPermissions";
import { clearEmployeeSetupWarnings } from "@/lib/utils/employeeSetupWarnings";

export const authLogout = () => {
  // Delete all cookies defined in AUTH_CONFIG
  Object.values(AUTH_CONFIG.COOKIE).forEach(deleteCookie);

  clearPortalPermissions();
  clearEmployeeSetupWarnings();
  localStorageUtil.clear();
  localStorageUtil.clearEmployees();
  localStorageUtil.clearEmployeeInfo();
  localStorageUtil.setEmployeeRole(null);

  localStorage.setItem("LOGOUT_SIGNAL", Date.now().toString());
};
