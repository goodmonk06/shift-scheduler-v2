import type { ShiftStatus } from "../types/api";

// 2025年の祝日データ（日本）
export const holidays2025: { [key: string]: number[] } = {
  "1": [1, 13], // 元日、成人の日
  "2": [11, 23, 24], // 建国記念の日、天皇誕生日、振替休日
  "3": [20], // 春分の日
  "4": [29], // 昭和の日
  "5": [3, 4, 5, 6], // 憲法記念日、みどりの日、こどもの日、振替休日
  "6": [],
  "7": [21], // 海の日
  "8": [11], // 山の日
  "9": [15, 22, 23], // 敬老の日、秋分の日、振替休日
  "10": [13], // スポーツの日
  "11": [3, 23, 24], // 文化の日、勤労感謝の日、振替休日
  "12": [],
};

// 時間枠の定義（モック）
export const timeSlots = [
  { id: "TS001", name: "早番", startTime: "07:00", endTime: "16:00", color: "from-blue-400 to-blue-500" },
  { id: "TS002", name: "遅番", startTime: "11:00", endTime: "20:00", color: "from-green-400 to-green-500" },
  { id: "TS003", name: "夜勤", startTime: "16:00", endTime: "09:00", color: "from-purple-400 to-purple-500" },
];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDayOfWeek(year: number, month: number, day: number): string {
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return ["日", "月", "火", "水", "木", "金", "土"][dayOfWeek];
}

export function getDayOfWeekNumber(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

export function isHoliday(year: number, month: number, day: number): boolean {
  if (year === 2025) {
    const monthHolidays = holidays2025[month.toString()] || [];
    return monthHolidays.includes(day);
  }
  return false;
}

export function getStatusLabel(status: ShiftStatus): string {
  switch (status) {
    case "vacation_only": return "希望休のみ";
    case "ai_generated": return "AI生成後";
    case "tentative": return "仮確定";
    case "tentative_revised": return "仮確定（改）";
    case "final": return "最終シフト";
    case "actual": return "実績";
  }
}

export function getStatusBadgeVariant(status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "vacation_only": return "outline";
    case "ai_generated": return "secondary";
    case "tentative":
    case "tentative_revised": return "default";
    case "final":
    case "actual": return "destructive";
  }
}

// 時刻を分に変換
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// 24時間タイムライン上の位置とサイズを計算（パーセンテージ）
export function calculateTimelinePosition(startTime: string, endTime: string): { left: number; width: number; isOvernight: boolean } {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // 日をまたぐ場合（夜勤）
  const isOvernight = endMinutes < startMinutes;
  if (isOvernight) {
    endMinutes = 24 * 60; // その日は24:00まで表示
  }

  const left = (startMinutes / (24 * 60)) * 100;
  const width = ((endMinutes - startMinutes) / (24 * 60)) * 100;

  return { left, width, isOvernight };
}

// 役職グループ別の色を取得
export function getPositionGroupColor(positionGroup?: "fulltime" | "parttime"): string {
  if (positionGroup === "fulltime") {
    return "from-indigo-400 to-indigo-600"; // 正社員: 濃い青紫
  } else {
    return "from-teal-400 to-teal-600"; // パート: 青緑
  }
}

// 人員数に応じたスタイルを取得（3色に簡素化）
export function getStaffCountStyle(count: number) {
  if (count === 0) {
    return {
      bg: "bg-red-500",
      text: "text-white",
      border: "border-red-600",
      label: "緊急",
      ring: "ring-red-200"
    };
  } else if (count === 1 || count === 2) {
    return {
      bg: "bg-yellow-500",
      text: "text-white",
      border: "border-yellow-600",
      label: "注意",
      ring: "ring-yellow-200"
    };
  } else {
    return {
      bg: "bg-green-500",
      text: "text-white",
      border: "border-green-600",
      label: "充足",
      ring: "ring-green-200"
    };
  }
}
