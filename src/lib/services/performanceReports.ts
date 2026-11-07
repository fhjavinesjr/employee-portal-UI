import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";

export async function openPerformanceReport(path: string): Promise<void> {
  const response = await fetchWithAuth(`${runtimeConfig.getApiUrl("primehr")}${path}`, { headers: { Accept: "application/pdf" } });
  if (!response.ok) { const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null; throw new Error(body?.detail ?? body?.message ?? `Report request failed (${response.status}).`); }
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/pdf")) throw new Error("The report service returned an invalid file type.");
  const objectUrl = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = objectUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
