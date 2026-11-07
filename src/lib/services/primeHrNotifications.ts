import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { runtimeConfig } from "@/lib/utils/runtimeConfig";

export type PrimeHrNotification = {
  id: string; recordVersion: number; sourceDomain: string; eventCode: string; kind: "ACTION_REQUIRED" | "INFORMATIONAL";
  sourceAggregateType: string; sourceAggregateId: string; sourceRecordVersion: number; routeKey: string;
  title: string; message: string; dueAt: string | null; actionState: "ACTIVE" | "CLOSED";
  readAt: string | null; dismissedAt: string | null; createdAt: string;
};
export type NotificationPage = { content: PrimeHrNotification[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean };
export type NotificationTarget = { available: boolean; routeKey: string; sourceAggregateType: string; sourceAggregateId: string; actionState: string };

const root = () => `${runtimeConfig.getApiUrl("primehr")}/api/primehr/v1/notifications/me`;
async function value<T>(response: Response): Promise<T> { if (response.ok) return response.json() as Promise<T>; const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null; throw new Error(body?.detail ?? body?.message ?? `Notification request failed (${response.status}).`); }

export const primeHrNotifications = {
  feed: async (unreadOnly: boolean, size: number) => value<NotificationPage>(await fetchWithAuth(`${root()}?unreadOnly=${unreadOnly}&includeDismissed=false&page=0&size=${size}`)),
  unread: async () => value<{ unreadCount: number }>(await fetchWithAuth(`${root()}/unread-count`)),
  markRead: async (item: PrimeHrNotification) => value<PrimeHrNotification>(await fetchWithAuth(`${root()}/${encodeURIComponent(item.id)}/read`, { method: "PUT", body: JSON.stringify({ recordVersion: item.recordVersion }) })),
  readAll: async () => value<{ updated: number; readAt: string }>(await fetchWithAuth(`${root()}/read-all`, { method: "PUT" })),
  dismiss: async (item: PrimeHrNotification) => value<PrimeHrNotification>(await fetchWithAuth(`${root()}/${encodeURIComponent(item.id)}/dismiss`, { method: "PUT", body: JSON.stringify({ recordVersion: item.recordVersion }) })),
  target: async (id: string) => value<NotificationTarget>(await fetchWithAuth(`${root()}/${encodeURIComponent(id)}/target`)),
};

export function portalNotificationRoute(target: NotificationTarget): string | null {
  if (target.sourceAggregateType === "SPMS_COMMITMENT_VERSION") return `/employee-portal/selfservice/MyPerformanceCommitments?notificationSource=${encodeURIComponent(target.sourceAggregateId)}`;
  return null;
}
