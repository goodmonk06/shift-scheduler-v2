import type { ShiftType } from "../types/employeeHomeTypes";

// 祝日データ型
export interface Holiday {
  day: number;
  name: string;
}

// 2025年の祝日データ（月ごと）
export const holidays2025: Record<number, Holiday[]> = {
  1: [
    { day: 1, name: "元日" },
    { day: 13, name: "成人の日" }
  ],
  2: [
    { day: 11, name: "建国記念の日" },
    { day: 23, name: "天皇誕生日" },
    { day: 24, name: "振替休日" }
  ],
  3: [
    { day: 20, name: "春分の日" }
  ],
  4: [
    { day: 29, name: "昭和の日" }
  ],
  5: [
    { day: 3, name: "憲法記念日" },
    { day: 4, name: "みどりの日" },
    { day: 5, name: "こどもの日" },
    { day: 6, name: "振替休日" }
  ],
  7: [
    { day: 21, name: "海の日" }
  ],
  8: [
    { day: 11, name: "山の日" }
  ],
  9: [
    { day: 15, name: "敬老の日" },
    { day: 22, name: "秋分の日" },
    { day: 23, name: "振替休日" }
  ],
  10: [
    { day: 13, name: "スポーツの日" }
  ],
  11: [
    { day: 3, name: "文化の日" },
    { day: 23, name: "勤労感謝の日" },
    { day: 24, name: "振替休日" }
  ],
  12: []
};

// 2026年の祝日データ
export const holidays2026: Record<number, Holiday[]> = {
  1: [
    { day: 1, name: "元日" },
    { day: 12, name: "成人の日" }
  ],
  2: [
    { day: 11, name: "建国記念の日" },
    { day: 23, name: "天皇誕生日" }
  ],
  3: [
    { day: 20, name: "春分の日" }
  ],
  4: [
    { day: 29, name: "昭和の日" }
  ],
  5: [
    { day: 3, name: "憲法記念日" },
    { day: 4, name: "みどりの日" },
    { day: 5, name: "こどもの日" },
    { day: 6, name: "振替休日" }
  ],
  6: [],
  7: [
    { day: 20, name: "海の日" }
  ],
  8: [
    { day: 11, name: "山の日" }
  ],
  9: [
    { day: 21, name: "敬老の日" },
    { day: 22, name: "国民の休日" },
    { day: 23, name: "秋分の日" }
  ],
  10: [
    { day: 12, name: "スポーツの日" }
  ],
  11: [
    { day: 3, name: "文化の日" },
    { day: 23, name: "勤労感謝の日" }
  ],
  12: []
};

// 後方互換性のため残す
export const holidays2025Nov = [3, 23, 24];

/**
 * 指定した年月の祝日を取得
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  if (year === 2025) {
    return holidays2025[month] || [];
  } else if (year === 2026) {
    return holidays2026[month] || [];
  }
  return [];
}

// シフト時間
export const shiftTimes: Record<ShiftType, string> = {
  "早番": "8:00 - 17:00",
  "遅番": "10:00 - 19:00",
  "夜勤": "17:00 - 翌9:00"
};

// 施設イベント（削除 - APIから取得）

// デフォルトのヘッダー画像URL
export const DEFAULT_HEADER_IMAGE_URL = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080";
