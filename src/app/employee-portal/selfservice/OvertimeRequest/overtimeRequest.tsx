"use client";

import { runtimeConfig } from "@/lib/utils/runtimeConfig";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import Swal from "sweetalert2"
import styles from "@/styles/LeaveApplication.module.scss";
import modalStyles from "@/styles/Modal.module.scss";
import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";

const API_BASE_URL_HRM = runtimeConfig.getApiUrl("hrm");
const API_BASE_URL_TIMEKEEPING = runtimeConfig.getApiUrl("timekeeping");
const API_BASE_URL_ADMINISTRATIVE = runtimeConfig.getApiUrl("administrative");

interface BreakComputation {
  status: "calculated" | "no-break" | "error";
  breakMinutes: number;
  shiftCodes: string[];
  requestedMinutes?: number;
  netMinutes?: number;
  estimatedNetHours?: number;
  message: string;
}

interface WorkScheduleDTO {
  tsCode?: string | null;
  wsDateTime: string;
  isDayOff?: boolean;
}

interface TimeShiftDTO {
  tsCode: string;
  tsName?: string;
  timeIn: string;
  breakOut?: string | null;
  breakIn?: string | null;
  timeOut: string;
}

interface OvertimeRequestDTO {
  overtimeRequestId?: number;
  employeeId: number;
  dateFiled: string;
  dateTimeFrom: string;
  dateTimeTo: string;
  totalHours?: number;
  netAuthorizedHours?: number;
  purpose: string;
  status: string;
  workType?: string;
  dutyShiftCode?: string | null;
  authorityReference?: string;
  emergencyPostFiling?: boolean;
  emergencyJustification?: string;
  breakMinutes?: number;
  recommendedById?: number | null;
  recommendationStatus?: string | null;
  approvedById?: number | null;
  approvedAt?: string | null;
  approvalRemarks?: string | null;
}

interface FormState {
  dateFiled: string;
  dateTimeFrom: string;
  dateTimeTo: string;
  purpose: string;
  workType: string;
  dutyShiftCode: string;
  authorityReference: string;
  emergencyPostFiling: boolean;
  emergencyJustification: string;
}

const SPECIAL_DUTY_TYPES = ["HOLIDAY_DUTY", "DAY_OFF_DUTY", "REST_DAY_DUTY"];

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatWorkScheduleParameter = (value: Date) =>
  `${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}-${value.getFullYear()} ${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;

const parseWorkScheduleDateTime = (value: string) => {
  const match = value?.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[1]) - 1,
      Number(match[2]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    );
  }
  return new Date(value);
};

const parseClockMinutes = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const localDateKey = (value?: string | null) => {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const toLocalDateTimeValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const shiftDateTimes = (dateKey: string, shift: TimeShiftDTO) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const timeIn = parseClockMinutes(shift.timeIn);
  const timeOut = parseClockMinutes(shift.timeOut);
  if (!year || !month || !day || timeIn === null || timeOut === null) return null;

  const from = new Date(year, month - 1, day, 0, 0, 0, 0);
  from.setMinutes(timeIn);
  const to = new Date(year, month - 1, day, 0, 0, 0, 0);
  to.setMinutes(timeOut);
  if (to <= from) to.setDate(to.getDate() + 1);

  return {
    from: toLocalDateTimeValue(from),
    to: toLocalDateTimeValue(to),
  };
};

const calculateScheduleBreak = (
  schedules: WorkScheduleDTO[],
  shifts: TimeShiftDTO[],
  requestStart: Date,
  requestEnd: Date,
): BreakComputation => {
  const shiftsByCode = new Map(
    shifts
      .filter((shift) => shift.tsCode?.trim())
      .map((shift): [string, TimeShiftDTO] => [shift.tsCode.trim().toUpperCase(), shift]),
  );
  const intervals: Array<{ start: number; end: number }> = [];
  const shiftCodes = new Set<string>();

  schedules.forEach((schedule) => {
    if (schedule.isDayOff) return;
    const scheduleCode = schedule.tsCode?.trim();
    if (!scheduleCode) return;
    const shift = shiftsByCode.get(scheduleCode.toUpperCase());
    if (!shift) return;
    shiftCodes.add(shift.tsCode);

    const breakOut = parseClockMinutes(shift.breakOut);
    const breakIn = parseClockMinutes(shift.breakIn);
    if (breakOut === null || breakIn === null) return;

    const scheduleDate = parseWorkScheduleDateTime(schedule.wsDateTime);
    if (Number.isNaN(scheduleDate.getTime())) return;

    const timeIn = parseClockMinutes(shift.timeIn);
    const timeOut = parseClockMinutes(shift.timeOut);
    const overnightShift = timeIn !== null && timeOut !== null && timeOut <= timeIn;
    const breakDate = new Date(
      scheduleDate.getFullYear(),
      scheduleDate.getMonth(),
      scheduleDate.getDate(),
      0,
      0,
      0,
      0,
    );
    if (overnightShift && timeIn !== null && breakOut < timeIn) {
      breakDate.setDate(breakDate.getDate() + 1);
    }

    const breakStart = new Date(breakDate);
    breakStart.setMinutes(breakOut);
    const breakEnd = new Date(breakDate);
    breakEnd.setMinutes(breakIn);
    if (breakEnd <= breakStart) breakEnd.setDate(breakEnd.getDate() + 1);

    const overlapStart = Math.max(requestStart.getTime(), breakStart.getTime());
    const overlapEnd = Math.min(requestEnd.getTime(), breakEnd.getTime());
    if (overlapEnd > overlapStart) intervals.push({ start: overlapStart, end: overlapEnd });
  });

  intervals.sort((left, right) => left.start - right.start);
  const merged: Array<{ start: number; end: number }> = [];
  intervals.forEach((current) => {
    const previous = merged[merged.length - 1];
    if (!previous || current.start > previous.end) {
      merged.push({ ...current });
    } else {
      previous.end = Math.max(previous.end, current.end);
    }
  });

  const requestedMinutes = Math.floor((requestEnd.getTime() - requestStart.getTime()) / 60000);
  const calculatedBreak = merged.reduce(
    (total, interval) => total + Math.floor((interval.end - interval.start) / 60000),
    0,
  );
  const breakMinutes = Math.min(calculatedBreak, Math.max(0, requestedMinutes - 1));
  const netMinutes = Math.max(0, requestedMinutes - breakMinutes);

  return {
    status: breakMinutes > 0 ? "calculated" : "no-break",
    breakMinutes,
    shiftCodes: Array.from(shiftCodes),
    requestedMinutes,
    netMinutes,
    estimatedNetHours: Math.round((netMinutes / 60) * 100) / 100,
    message:
      breakMinutes > 0
        ? "Meal/lunch minutes were calculated from the assigned Work Schedule and Time Shift."
        : shiftCodes.size > 0
          ? "The assigned shift has no meal/lunch break overlapping the requested period."
          : "No assigned Work Schedule and Time Shift were found for the requested period.",
  };
};

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function OvertimeRequest() {
  const [activeTab, setActiveTab] = useState<"table" | "apply">("table");
  const [records, setRecords] = useState<OvertimeRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [breakComputation, setBreakComputation] = useState<BreakComputation | null>(null);
  const [isCalculatingBreak, setIsCalculatingBreak] = useState(false);
  const [timeShifts, setTimeShifts] = useState<TimeShiftDTO[]>([]);
  const [timeSuggestionMessage, setTimeSuggestionMessage] = useState("");
  const [regularSuggestionVersion, setRegularSuggestionVersion] = useState(0);
  const processedRegularSuggestion = useRef(0);

  const toLocalDateTimeInput = (date: Date) => toLocalDateTimeValue(date);
  const today = toLocalDateTimeInput(new Date()).slice(0, 10);
  const nowLocal = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return toLocalDateTimeInput(now);
  };

  const createEmptyForm = (): FormState => ({
    dateFiled: today,
    dateTimeFrom: nowLocal(),
    dateTimeTo: nowLocal(),
    purpose: "",
    workType: "",
    dutyShiftCode: "",
    authorityReference: "",
    emergencyPostFiling: false,
    emergencyJustification: "",
  });

  const [form, setForm] = useState<FormState>(createEmptyForm);

  const applyDutyShiftSuggestion = useCallback((shiftCode: string, dateKey?: string) => {
    const shift = timeShifts.find((item) => item.tsCode === shiftCode);
    if (!shift) {
      setTimeSuggestionMessage(shiftCode ? "The selected Duty Shift could not be loaded." : "");
      return;
    }
    const suggestion = shiftDateTimes(dateKey ?? localDateKey(form.dateTimeFrom), shift);
    if (!suggestion) {
      setTimeSuggestionMessage("The selected Duty Shift has an invalid time-in or time-out.");
      return;
    }
    setForm((current) => ({
      ...current,
      dutyShiftCode: shiftCode,
      dateTimeFrom: suggestion.from,
      dateTimeTo: suggestion.to,
    }));
    setTimeSuggestionMessage(
      `Suggested from Duty Shift ${shift.tsCode}: ${shift.timeIn}–${shift.timeOut}. You may adjust the inclusive dates and times.`,
    );
  }, [form.dateTimeFrom, timeShifts]);

  const requestRegularSuggestion = useCallback(() => {
    setRegularSuggestionVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (
      form.workType !== "REGULAR_OVERTIME" ||
      regularSuggestionVersion === 0 ||
      processedRegularSuggestion.current === regularSuggestionVersion ||
      timeShifts.length === 0
    ) return;

    const employeeId = localStorageUtil.getEmployeeId();
    if (!employeeId) return;
    processedRegularSuggestion.current = regularSuggestionVersion;
    const dateKey = localDateKey(form.dateTimeFrom);
    const [year, month, day] = dateKey.split("-").map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 0);
    let cancelled = false;

    const loadSuggestion = async () => {
      setTimeSuggestionMessage("Checking the assigned Work Schedule…");
      try {
        const params = new URLSearchParams({
          employeeId: String(employeeId),
          monthStart: formatWorkScheduleParameter(dayStart),
          monthEnd: formatWorkScheduleParameter(dayEnd),
        });
        const response = await fetchWithAuth(
          `${API_BASE_URL_TIMEKEEPING}/api/getListByEmployeeAndDateRange/work-schedule?${params.toString()}`,
        );
        if (!response.ok && response.status !== 204) {
          throw new Error(`Work Schedule checker returned HTTP ${response.status}.`);
        }
        const schedules: WorkScheduleDTO[] = response.status === 204 ? [] : await response.json();
        const candidates = schedules
          .filter((schedule) => !schedule.isDayOff && schedule.tsCode)
          .map((schedule) => {
            const shift = timeShifts.find(
              (item) => item.tsCode.trim().toUpperCase() === schedule.tsCode!.trim().toUpperCase(),
            );
            if (!shift) return null;
            const scheduleDate = parseWorkScheduleDateTime(schedule.wsDateTime);
            if (Number.isNaN(scheduleDate.getTime())) return null;
            const scheduleKey = `${scheduleDate.getFullYear()}-${pad2(scheduleDate.getMonth() + 1)}-${pad2(scheduleDate.getDate())}`;
            if (scheduleKey !== dateKey) return null;
            const bounds = shiftDateTimes(dateKey, shift);
            return bounds ? { shift, bounds } : null;
          })
          .filter((candidate): candidate is { shift: TimeShiftDTO; bounds: { from: string; to: string } } => candidate !== null)
          .sort((left, right) => new Date(right.bounds.to).getTime() - new Date(left.bounds.to).getTime());

        if (cancelled) return;
        const selected = candidates[0];
        if (!selected) {
          setTimeSuggestionMessage("No working Time Shift is plotted for this employee on the selected date.");
          return;
        }
        setForm((current) => {
          if (current.workType !== "REGULAR_OVERTIME" || localDateKey(current.dateTimeFrom) !== dateKey) return current;
          return { ...current, dateTimeFrom: selected.bounds.to, dateTimeTo: "" };
        });
        setTimeSuggestionMessage(
          `Suggested overtime start after assigned shift ${selected.shift.tsCode} ends at ${selected.shift.timeOut}. Enter the expected overtime end.`,
        );
      } catch (error) {
        if (!cancelled) {
          setTimeSuggestionMessage(
            error instanceof Error ? error.message : "Unable to load the assigned Work Schedule.",
          );
        }
      }
    };
    void loadSuggestion();
    return () => { cancelled = true; };
  }, [form.dateTimeFrom, form.workType, regularSuggestionVersion, timeShifts]);

  const handleWorkTypeChange = (workType: string) => {
    const dateKey = localDateKey(form.dateTimeFrom);
    setTimeSuggestionMessage("");
    if (workType === "REGULAR_OVERTIME") {
      setForm((current) => ({
        ...current,
        workType,
        dutyShiftCode: "",
        dateTimeFrom: `${dateKey}T00:00`,
        dateTimeTo: "",
      }));
      requestRegularSuggestion();
      return;
    }
    setForm((current) => ({ ...current, workType, dutyShiftCode: "" }));
  };

  const handleDateTimeFromChange = (value: string) => {
    if (!value) {
      setForm((current) => ({ ...current, dateTimeFrom: "" }));
      return;
    }
    const oldDate = localDateKey(form.dateTimeFrom);
    const newDate = localDateKey(value);
    if (newDate !== oldDate && SPECIAL_DUTY_TYPES.includes(form.workType) && form.dutyShiftCode) {
      applyDutyShiftSuggestion(form.dutyShiftCode, newDate);
      return;
    }
    if (newDate !== oldDate && form.workType === "REGULAR_OVERTIME") {
      setForm((current) => ({ ...current, dateTimeFrom: value, dateTimeTo: "" }));
      requestRegularSuggestion();
      return;
    }
    setForm((current) => ({ ...current, dateTimeFrom: value }));
  };

  const reapplyTimeSuggestion = () => {
    if (SPECIAL_DUTY_TYPES.includes(form.workType) && form.dutyShiftCode) {
      applyDutyShiftSuggestion(form.dutyShiftCode);
    } else if (form.workType === "REGULAR_OVERTIME") {
      requestRegularSuggestion();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadTimeShifts = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL_ADMINISTRATIVE}/api/getAll/time-shift`);
        if (!response.ok) throw new Error();
        const data: TimeShiftDTO[] = await response.json();
        if (!cancelled) setTimeShifts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTimeShifts([]);
      }
    };
    void loadTimeShifts();
    return () => { cancelled = true; };
  }, []);

  const duration = useMemo(() => {
    if (!form.dateTimeFrom || !form.dateTimeTo) return null;
    const start = new Date(form.dateTimeFrom);
    const end = new Date(form.dateTimeTo);
    if (end <= start) return null;
    const elapsedMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    return {
      elapsedMinutes,
      hours: Math.floor(elapsedMinutes / 60),
      minutes: elapsedMinutes % 60,
    };
  }, [form.dateTimeFrom, form.dateTimeTo]);

  const estimatedNetDuration = useMemo(() => {
    if (!duration) return null;
    const breakMinutes = breakComputation?.breakMinutes ?? 0;
    const netMinutes = Math.max(0, duration.elapsedMinutes - breakMinutes);
    return {
      totalMinutes: netMinutes,
      hours: Math.floor(netMinutes / 60),
      minutes: netMinutes % 60,
    };
  }, [duration, breakComputation]);

  useEffect(() => {
    if (!form.dateTimeFrom || !form.dateTimeTo) {
      setBreakComputation(null);
      setIsCalculatingBreak(false);
      return;
    }

    const requestStart = new Date(form.dateTimeFrom);
    const requestEnd = new Date(form.dateTimeTo);
    if (Number.isNaN(requestStart.getTime()) || Number.isNaN(requestEnd.getTime()) || requestEnd <= requestStart) {
      setBreakComputation(null);
      setIsCalculatingBreak(false);
      return;
    }

    const employeeId = localStorageUtil.getEmployeeId();
    if (!employeeId) return;

    const specialDuty = SPECIAL_DUTY_TYPES.includes(form.workType);
    if (specialDuty && !form.dutyShiftCode) {
      setBreakComputation({
        status: "error",
        breakMinutes: 0,
        shiftCodes: [],
        message: "Select the configured Duty Shift for this non-working-day authority.",
      });
      setIsCalculatingBreak(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCalculatingBreak(true);
      try {
        const rangeStart = new Date(requestStart);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(requestEnd);
        rangeEnd.setHours(23, 59, 59, 0);
        const scheduleParams = new URLSearchParams({
          employeeId: String(employeeId),
          monthStart: formatWorkScheduleParameter(rangeStart),
          monthEnd: formatWorkScheduleParameter(rangeEnd),
        });
        const scheduleResponse = await fetchWithAuth(
          `${API_BASE_URL_TIMEKEEPING}/api/getListByEmployeeAndDateRange/work-schedule?${scheduleParams.toString()}`,
        );

        if (!scheduleResponse.ok && scheduleResponse.status !== 204) {
          throw new Error(`Work Schedule checker returned HTTP ${scheduleResponse.status}.`);
        }
        const schedules: WorkScheduleDTO[] =
          scheduleResponse.status === 204 ? [] : await scheduleResponse.json();
        if (timeShifts.length === 0) throw new Error("Configured Time Shift records are unavailable.");
        const schedulesForBreak = specialDuty
          ? [{
              tsCode: form.dutyShiftCode,
              wsDateTime: formatWorkScheduleParameter(requestStart),
              isDayOff: false,
            }]
          : schedules;
        const result = calculateScheduleBreak(schedulesForBreak, timeShifts, requestStart, requestEnd);
        if (!cancelled) setBreakComputation(result);
      } catch (error) {
        if (!cancelled) {
          setBreakComputation({
            status: "error",
            breakMinutes: 0,
            shiftCodes: [],
            message: error instanceof Error ? error.message : "Unable to calculate the scheduled break.",
          });
        }
      } finally {
        if (!cancelled) setIsCalculatingBreak(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.dateTimeFrom, form.dateTimeTo, form.workType, form.dutyShiftCode, timeShifts]);
  const fetchRecords = useCallback(async () => {
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/overtime-request/get-all/${empId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: OvertimeRequestDTO[] = await res.json();
      setRecords(data);
    } catch {
      Toast.fire({ icon: "error", title: "Could not load overtime records" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEmployeeNames = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/employees/basicInfo`);
      if (!res.ok) return;
      const data: { employeeId: number; fullName?: string; firstname?: string; lastname?: string }[] = await res.json();
      const map = new Map<number, string>();
      data.forEach((e) => {
        const name = e.fullName?.trim() || [e.firstname, e.lastname].filter(Boolean).join(" ").trim();
        if (e.employeeId && name) map.set(e.employeeId, name);
      });
      setNameMap(map);
    } catch {}
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchEmployeeNames();
  }, [fetchRecords, fetchEmployeeNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = localStorageUtil.getEmployeeId();
    if (!empId) {
      Swal.fire({ icon: "warning", title: "Session expired. Please log in again." });
      return;
    }
    if (!duration) {
      Swal.fire({ icon: "warning", title: "End time must be after start time" });
      return;
    }
    if (!form.workType) {
      Swal.fire({ icon: "warning", title: "Work type is required" });
      return;
    }
    if (SPECIAL_DUTY_TYPES.includes(form.workType) && !form.dutyShiftCode) {
      Swal.fire({ icon: "warning", title: "Duty Shift is required for non-working-day duty" });
      return;
    }
    if (!form.authorityReference.trim()) {
      Swal.fire({ icon: "warning", title: "Authority / Office Order Reference is required" });
      return;
    }
    if (form.emergencyPostFiling && !form.emergencyJustification.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Post-filing justification is required",
        text: "Explain why the overtime authority could not be filed before the work was rendered.",
      });
      return;
    }
    if (new Date(form.dateTimeFrom).getTime() < Date.now() && !form.emergencyPostFiling) {
      Swal.fire({
        icon: "warning",
        title: "This is a post-filing request",
        text: "The overtime start is already in the past. Select Emergency / Post-filing authority and provide a justification.",
      });
      return;
    }
    if (isCalculatingBreak) {
      Swal.fire({ icon: "info", title: "Please wait for the schedule-based break calculation" });
      return;
    }
    if (!breakComputation || breakComputation.status === "error") {
      Swal.fire({
        icon: "warning",
        title: "Scheduled break could not be determined",
        text: breakComputation?.message ?? "Please verify that a Work Schedule and Time Shift are assigned for the requested date.",
      });
      return;
    }
    if (!form.purpose.trim()) {
      Swal.fire({ icon: "warning", title: "Purpose / justification is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: OvertimeRequestDTO = {
        employeeId: Number(empId),
        dateFiled: form.dateFiled,
        dateTimeFrom: form.dateTimeFrom.replace("T", " ") + ":00",
        dateTimeTo: form.dateTimeTo.replace("T", " ") + ":00",
        purpose: form.purpose,
        workType: form.workType,
        dutyShiftCode: form.dutyShiftCode || null,
        breakMinutes: breakComputation.breakMinutes,
        authorityReference: form.authorityReference.trim(),
        emergencyPostFiling: form.emergencyPostFiling,
        emergencyJustification: form.emergencyPostFiling
          ? form.emergencyJustification.trim()
          : undefined,
        status: "Pending",
      };
      const url = editingId !== null
        ? `${API_BASE_URL_HRM}/api/overtime-request/update/${editingId}`
        : `${API_BASE_URL_HRM}/api/overtime-request/create`;
      const res = await fetchWithAuth(url, {
        method: editingId !== null ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: editingId !== null ? "Overtime request updated" : "Overtime request filed successfully" });
      setForm(createEmptyForm());
      setTimeSuggestionMessage("");
      setEditingId(null);
      setActiveTab("table");
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to file overtime request", text: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const color =
      status === "Approved" ? "#16a34a" :
      status === "Disapproved" ? "#dc2626" : "#ca8a04";
    return <span style={{ color, fontWeight: 600, fontSize: "0.8rem" }}>{status}</span>;
  };

  const fmtDateTime = (dt: string | null | undefined) => {
    if (!dt) return "—";
    return dt.replace("T", " ").substring(0, 16);
  };

  const handleEdit = (r: OvertimeRequestDTO) => {
    setEditingId(r.overtimeRequestId!);
    setForm({
      dateFiled: r.dateFiled,
      dateTimeFrom: (r.dateTimeFrom ?? "").replace(" ", "T").substring(0, 16),
      dateTimeTo: (r.dateTimeTo ?? "").replace(" ", "T").substring(0, 16),
      purpose: r.purpose,
      workType: r.workType ?? "",
      dutyShiftCode: r.dutyShiftCode ?? "",
      authorityReference: r.authorityReference ?? "",
      emergencyPostFiling: r.emergencyPostFiling ?? false,
      emergencyJustification: r.emergencyJustification ?? "",
    });
    setTimeSuggestionMessage("Saved inclusive dates and times are shown. They will not be replaced unless you change or reapply the shift suggestion.");
    setActiveTab("apply");
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete this overtime request?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL_HRM}/api/overtime-request/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      Toast.fire({ icon: "success", title: "Overtime request deleted" });
      fetchRecords();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete", text: String(err) });
    }
  };

  const handlePrint = async (record: OvertimeRequestDTO) => {
    const id = record.overtimeRequestId;
    if (!id) {
      await Swal.fire({
        icon: "error",
        title: "Print Failed",
        text: "The overtime request ID is missing.",
      });
      return;
    }

    const finalStatus = (record.status ?? "").trim().toLowerCase();
    if (finalStatus !== "approved" && finalStatus !== "disapproved") {
      await Swal.fire({
        icon: "info",
        title: "Report Not Available Yet",
        text: "The overtime request can only be printed after it is finally Approved or Disapproved.",
      });
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL_HRM}/api/overtime-request/report/${id}`,
        { method: "GET" }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to generate overtime request report.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `OvertimeAuthorization_${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Print Failed",
        text: err instanceof Error ? err.message : "Unable to generate overtime request report.",
      });
    }
  };

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase();
    return r.dateFiled.toLowerCase().includes(q) || r.purpose.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const formatWorkType = (workType?: string) => {
    switch (workType) {
      case "REGULAR_OVERTIME": return "Regular Workday Overtime";
      case "HOLIDAY_DUTY": return "Holiday Duty";
      case "DAY_OFF_DUTY": return "Scheduled Day-Off Duty";
      case "REST_DAY_DUTY": return "Rest-Day Duty";
      default: return workType || "—";
    }
  };

  return (
    <div id="overtimeRequest" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Overtime Request</h2>
        </div>

        <div className={modalStyles.modalBody}>
          {/* Tabs */}
          <div className={styles.tabContainer} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === "table" ? 700 : 400, color: activeTab === "table" ? "#1d4ed8" : "#374151", borderBottom: activeTab === "table" ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}
            >
              My Requests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("apply")}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: activeTab === "apply" ? 700 : 400, color: activeTab === "apply" ? "#1d4ed8" : "#374151", borderBottom: activeTab === "apply" ? "2px solid #1d4ed8" : "none", paddingBottom: "0.25rem" }}
            >
              {editingId !== null ? "Edit Request" : "File Request"}
            </button>
          </div>

          {activeTab === "table" && (
            <>
              {isLoading && <p>Loading...</p>}
              {!isLoading && records.length === 0 && <p>No overtime request records found.</p>}
              {!isLoading && records.length > 0 && (
                <>
                  <div className={styles.tableToolbar}>
                    <input
                      type="text"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ border: "1px solid #ccc", borderRadius: 4, padding: "5px 10px", fontSize: "13px", minWidth: "180px" }}
                    />
                    <div className={styles.paginationControls}>
                      <label>Rows:</label>
                      <select className={styles.rowSelect} value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                        {[10, 25, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className={styles.recordInfo}>
                        {filteredRecords.length === 0 ? "0" : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredRecords.length)} of {filteredRecords.length}
                      </span>
                      <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</button>
                      <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
                      <span className={styles.pageIndicator}>Page {currentPage} of {totalPages || 1}</span>
                      <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
                      <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>Last</button>
                    </div>
                  </div>
                  {paginatedRecords.length === 0 ? (
                    <p>No results match your search.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9" }}>
                            <th style={th}>Date Filed</th>
                            <th style={th}>Work Type</th>
                            <th style={th}>From</th>
                            <th style={th}>To</th>
                            <th style={th}>Total Hours</th>
                            <th style={th}>Purpose</th>
                            <th style={th}>Status</th>
                            <th style={th}>Remarks</th>
                            <th style={th}>Recommending Officer</th>
                            <th style={th}>Approved By</th>
                            <th style={th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.map((r) => (
                            <tr key={r.overtimeRequestId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={td}>{r.dateFiled}</td>
                              <td style={td}>{formatWorkType(r.workType)}</td>
                              <td style={td}>{fmtDateTime(r.dateTimeFrom)}</td>
                              <td style={td}>{fmtDateTime(r.dateTimeTo)}</td>
                              <td style={td}>{(r.netAuthorizedHours ?? r.totalHours ?? 0).toFixed(2)} hrs</td>
                              <td style={td}>{r.purpose}</td>
                              <td style={td}>
                                {statusBadge(
                                  r.status === "Pending" && r.recommendationStatus === "Recommended"
                                    ? "For Final Approval"
                                    : r.status
                                )}
                              </td>
                              <td style={td}>{r.approvalRemarks ?? "—"}</td>
                              <td style={td}>{r.recommendedById ? (nameMap.get(r.recommendedById) ?? "—") : "—"}</td>
                              <td style={td}>{r.approvedById ? (nameMap.get(r.approvedById) ?? "—") : "—"}</td>
                              <td style={td}>
                                {r.status === "Pending" && r.recommendationStatus !== "Recommended" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(r)}
                                      style={editBtnStyle}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(r.overtimeRequestId!)}
                                      style={deleteBtnStyle}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                ) : (
                                  (r.status === "Approved" || r.status === "Disapproved") && (
                                    <button
                                      type="button"
                                      onClick={() => handlePrint(r)}
                                      style={printBtnStyle}
                                      title="Print Overtime Authorization"
                                    >
                                      🖨️ Print
                                    </button>
                                  )
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "apply" && (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", maxWidth: 520 }}>
              <div className={styles.formGroup}>
                <label>Date Filed</label>
                <input type="date" value={form.dateFiled} readOnly className={styles.inputField} required style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
              </div>
              <div className={styles.formGroup}>
                <label>Work Type</label>
                <select
                  value={form.workType}
                  onChange={(e) => handleWorkTypeChange(e.target.value)}
                  className={styles.inputField}
                  required
                >
                  <option value="">Select work type</option>
                  <option value="REGULAR_OVERTIME">Regular Workday Overtime</option>
                  <option value="HOLIDAY_DUTY">Holiday Duty</option>
                  <option value="DAY_OFF_DUTY">Scheduled Day-Off Duty</option>
                  <option value="REST_DAY_DUTY">Rest-Day Duty</option>
                </select>
              </div>
              {SPECIAL_DUTY_TYPES.includes(form.workType) && (
                <div className={styles.formGroup}>
                  <label>Duty Shift Template</label>
                  <select
                    value={form.dutyShiftCode}
                    onChange={(e) => {
                      const shiftCode = e.target.value;
                      if (shiftCode) applyDutyShiftSuggestion(shiftCode);
                      else {
                        setForm((current) => ({ ...current, dutyShiftCode: "" }));
                        setTimeSuggestionMessage("");
                      }
                    }}
                    className={styles.inputField}
                    required
                  >
                    <option value="">Select configured duty shift</option>
                    {timeShifts.map((shift) => (
                      <option key={shift.tsCode} value={shift.tsCode}>
                        {shift.tsCode}{shift.tsName ? ` — ${shift.tsName}` : ""} ({shift.timeIn}–{shift.timeOut})
                      </option>
                    ))}
                  </select>
                  <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                    This defines the expected duty hours and meal break without changing the employee&apos;s regular Work Schedule.
                  </span>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Authority / Office Order Reference</label>
                <input
                  type="text"
                  value={form.authorityReference}
                  onChange={(e) => setForm({ ...form, authorityReference: e.target.value })}
                  className={styles.inputField}
                  placeholder="Enter office order or authority reference"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Inclusive Date &amp; Time — From</label>
                <input type="datetime-local" value={form.dateTimeFrom} onChange={(e) => handleDateTimeFromChange(e.target.value)} className={styles.inputField} required />
              </div>
              <div className={styles.formGroup}>
                <label>Inclusive Date &amp; Time — To</label>
                <input type="datetime-local" value={form.dateTimeTo} min={form.dateTimeFrom} onChange={(e) => setForm({ ...form, dateTimeTo: e.target.value })} className={styles.inputField} required />
              </div>
              {form.workType && (
                <div style={{ marginTop: "-0.35rem", color: "#64748b", fontSize: "0.8rem" }}>
                  {timeSuggestionMessage && <span>{timeSuggestionMessage}</span>}
                  {(form.workType === "REGULAR_OVERTIME" || (SPECIAL_DUTY_TYPES.includes(form.workType) && form.dutyShiftCode)) && (
                    <button
                      type="button"
                      onClick={reapplyTimeSuggestion}
                      style={{ marginLeft: timeSuggestionMessage ? "0.45rem" : 0, border: 0, padding: 0, color: "#2563eb", background: "transparent", cursor: "pointer", textDecoration: "underline", fontSize: "0.8rem" }}
                    >
                      Reapply suggestion
                    </button>
                  )}
                </div>
              )}
              {duration && (
                <div className={styles.formGroup}>
                  <label>System-computed Overtime Estimate</label>
                  <div style={{ padding: "0.4rem 0.6rem", background: "#f1f5f9", borderRadius: 4, fontSize: "0.9rem" }}>
                    {isCalculatingBreak ? (
                      <span>Checking assigned Work Schedule and Time Shift…</span>
                    ) : (
                      <>
                        <span style={{ display: "block" }}>
                          Requested duration: {duration.hours} hr(s) {duration.minutes} min(s)
                        </span>
                        <span style={{ display: "block" }}>
                          Meal/lunch deduction: {breakComputation?.breakMinutes ?? 0} minute(s)
                        </span>
                        <strong style={{ display: "block", marginTop: "0.25rem" }}>
                          Estimated creditable duration: {estimatedNetDuration?.hours ?? 0} hr(s) {estimatedNetDuration?.minutes ?? 0} min(s)
                        </strong>
                        {breakComputation?.shiftCodes.length ? (
                          <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                            Assigned shift: {breakComputation.shiftCodes.join(", ")}
                          </span>
                        ) : null}
                        {breakComputation && (
                          <span
                            style={{
                              display: "block",
                              color: breakComputation.status === "error"
                                ? "#b45309"
                                : "#64748b",
                              fontSize: "0.8rem",
                              marginTop: "0.2rem",
                            }}
                          >
                            {breakComputation.message}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              <label
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  padding: "0.55rem 0.65rem",
                  background: form.emergencyPostFiling ? "#fff7ed" : "#f8fafc",
                  border: `1px solid ${form.emergencyPostFiling ? "#fdba74" : "#e2e8f0"}`,
                  borderRadius: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.emergencyPostFiling}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      emergencyPostFiling: e.target.checked,
                      emergencyJustification: e.target.checked ? current.emergencyJustification : "",
                    }))
                  }
                  style={{ marginTop: "0.15rem" }}
                />
                <span>
                  <strong style={{ display: "block" }}>Emergency / Post-filing authority</strong>
                  <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                    Select when the work was already rendered or a DTR already exists. The request remains Pending and still follows IS recommendation and final approval.
                  </span>
                </span>
              </label>
              {form.emergencyPostFiling && (
                <div className={styles.formGroup}>
                  <label>Emergency / Post-filing Justification</label>
                  <textarea
                    value={form.emergencyJustification}
                    onChange={(e) => setForm((current) => ({ ...current, emergencyJustification: e.target.value }))}
                    className={styles.inputField}
                    rows={2}
                    maxLength={500}
                    placeholder="Explain why prior filing was not possible and identify the rendered duty/DTR."
                    required
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Purpose / Justification</label>
                <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={styles.inputField} rows={3} required />
              </div>
              <div className={styles.buttonGroup}>
                <button type="submit" disabled={isSubmitting || isCalculatingBreak} className={styles.submitBtn}>
                  {isCalculatingBreak
                    ? "Calculating Schedule..."
                    : isSubmitting
                      ? "Submitting..."
                      : (editingId !== null ? "Update Request" : "File Overtime Request")}
                </button>
                <button type="button" onClick={() => { setForm(createEmptyForm()); setEditingId(null); setActiveTab("table"); }} className={styles.clearBtn}>
                  {editingId !== null ? "Cancel Edit" : "Clear"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "6px 12px", verticalAlign: "middle" };
const editBtnStyle: React.CSSProperties = { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", marginRight: "0.3rem", fontSize: "0.8rem" };
const deleteBtnStyle: React.CSSProperties = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", fontSize: "0.8rem" };
const printBtnStyle: React.CSSProperties = { background: "#6b7280", color: "#fff", border: "none", borderRadius: 5, padding: "0.25rem 0.55rem", cursor: "pointer", fontSize: "0.8rem" };
