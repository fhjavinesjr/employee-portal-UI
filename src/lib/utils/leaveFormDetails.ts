export const VACATION_LOCATION_OPTIONS = ["Within the Philippines", "Abroad"] as const;
export const SICK_LOCATION_OPTIONS = ["In Hospital", "Out Patient"] as const;
export const STUDY_LEAVE_OPTIONS = [
  "Completion of Master's Degree",
  "BAR/Board Examination Review",
] as const;

export type LeaveDetailKind = "vacation" | "sick" | "women" | "study" | "general";

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function leaveDetailKind(leaveType: string): LeaveDetailKind {
  const type = normalize(leaveType);
  if (type === "vacation leave" || type === "special privilege leave") return "vacation";
  if (type === "sick leave") return "sick";
  if (type === "gynecological leave" || type === "special leave benefits for women") return "women";
  if (type === "study leave") return "study";
  return "general";
}

export function serializeLeaveDetails(kind: LeaveDetailKind, option: string, details: string): string {
  const value = details.trim();
  const serialized = kind === "vacation" || kind === "sick"
    ? `${option}${value ? `: ${value}` : ""}`
    : kind === "study"
      ? option
      : value;
  return serialized.slice(0, 500);
}

export function parseLeaveDetails(leaveType: string, storedDetails: string): { option: string; details: string } {
  const kind = leaveDetailKind(leaveType);
  const value = storedDetails.trim();
  const options = kind === "vacation"
    ? VACATION_LOCATION_OPTIONS
    : kind === "sick"
      ? SICK_LOCATION_OPTIONS
      : kind === "study"
        ? STUDY_LEAVE_OPTIONS
        : [];

  for (const option of options) {
    if (normalize(value) === normalize(option)) return { option, details: "" };
    const prefix = `${option}:`;
    if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
      return { option, details: value.slice(prefix.length).trim() };
    }
  }

  if (kind === "vacation") return { option: VACATION_LOCATION_OPTIONS[0], details: value };
  if (kind === "sick") return { option: SICK_LOCATION_OPTIONS[1], details: value };
  return { option: "", details: value };
}
