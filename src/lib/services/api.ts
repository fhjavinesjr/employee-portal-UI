import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { PersonalData } from "@/lib/types/PersonalData";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

///Personal Data
export async function fetchPersonalData(
  employeeId: number
): Promise<PersonalData> {

  const response = await fetchWithAuth(`${API_BASE_URL_HRM}/api/fetch/personal-data/${employeeId}`,{
    method: "GET" 
});

  if (!response.ok) {
    throw new Error("Failed to fetch personal data");
  }

  return response.json(); // ✅ THIS is the key
}

//Employee Password Update
export async function updateEmployeePassword(
  employeeId: number,
  currentPassword: string,
  employeePassword: string
) {
  const payload = {
    currentPassword,
    employeePassword,
  };

  const response = await fetchWithAuth(
    `${API_BASE_URL_HRM}/api/employee/password/update/${employeeId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  const responseText = await response.text(); // read body once

  if (!response.ok) {
    let errorMessage = "Failed to update password";

    try {
      // Try to parse JSON
      const errorData = JSON.parse(responseText);

      // Spring's ResponseStatusException usually sends { timestamp, status, error, message, path }
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else {
        errorMessage = JSON.stringify(errorData);
      }
    } catch {
      // If not JSON, just use plain text
      errorMessage = responseText;
    }

    throw new Error(errorMessage);
  }

  // If ok, parse JSON
  return JSON.parse(responseText);
}