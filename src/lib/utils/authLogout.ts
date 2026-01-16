import { AUTH_CONFIG } from "@/lib/utils/authConfig";
import { deleteCookie } from "@/lib/utils/cookies";

export const authLogout = () => {
  // Delete all cookies defined in AUTH_CONFIG
  Object.values(AUTH_CONFIG.COOKIE).forEach(deleteCookie);

  localStorage.setItem("LOGOUT_SIGNAL", Date.now().toString());
};