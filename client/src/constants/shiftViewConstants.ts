import type { ShiftDay } from "../types/shiftViewTypes";

export const tentativeShifts: ShiftDay[] = [
  { date: "11/10", day: 10, shiftType: "早番", time: "8:00-17:00", status: "tentative" },
  { date: "11/11", day: 11, shiftType: "遅番", time: "10:00-19:00", status: "tentative" },
  { date: "11/12", day: 12, shiftType: "休み", time: "-", status: "tentative" },
  { date: "11/13", day: 13, shiftType: "早番", time: "8:00-17:00", status: "tentative" },
  { date: "11/14", day: 14, shiftType: "夜勤", time: "17:00-翌9:00", status: "tentative" },
  { date: "11/15", day: 15, shiftType: "休み", time: "-", status: "tentative" },
];

export const confirmedShifts: ShiftDay[] = [
  { date: "11/16", day: 16, shiftType: "早番", time: "8:00-17:00", status: "confirmed" },
  { date: "11/17", day: 17, shiftType: "遅番", time: "10:00-19:00", status: "confirmed" },
  { date: "11/18", day: 18, shiftType: "休み", time: "-", status: "confirmed" },
  { date: "11/19", day: 19, shiftType: "早番", time: "8:00-17:00", status: "confirmed" },
  { date: "11/20", day: 20, shiftType: "夜勤", time: "17:00-翌9:00", status: "confirmed" },
];

export const completedShifts: ShiftDay[] = [
  { date: "11/1", day: 1, shiftType: "早番", time: "8:00-17:00", status: "completed", actualTime: "8:00-17:00", reportStatus: "approved" },
  { date: "11/2", day: 2, shiftType: "遅番", time: "10:00-19:00", status: "completed", actualTime: "10:00-19:30", reportStatus: "approved" },
  { date: "11/3", day: 3, shiftType: "休み", time: "-", status: "completed", reportStatus: "approved" },
  { date: "11/4", day: 4, shiftType: "早番", time: "8:00-17:00", status: "completed", actualTime: "8:00-17:00", reportStatus: "not_reported" },
  { date: "11/5", day: 5, shiftType: "夜勤", time: "17:00-翌9:00", status: "completed", actualTime: "17:00-翌9:15", reportStatus: "reported" },
];

// 仮確定後の追加希望締め切り（モック）
export const additionalRequestDeadline = new Date("2025-11-20T23:59:59");

// 実績報告期限（モック）
export const actualReportDeadline = new Date("2025-11-10T23:59:59");
