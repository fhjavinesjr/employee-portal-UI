export const authLogout = () => {
  // Delete cookies
  document.cookie = "isLoggedIn=; path=/; max-age=0";
  document.cookie = "lastActivity=; path=/; max-age=0";
  document.cookie = "authToken=; path=/; max-age=0";

  // Clear localStorage
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("lastActivity");
  localStorage.removeItem("authToken");
  localStorage.removeItem("employeeNo");
  localStorage.removeItem("employeeFullname");
  localStorage.removeItem("employeeRole");
};
