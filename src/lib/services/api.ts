import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { PersonalData } from "@/lib/types/PersonalData";

const API_BASE_URL_HRM = process.env.NEXT_PUBLIC_API_BASE_URL_HRM;

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