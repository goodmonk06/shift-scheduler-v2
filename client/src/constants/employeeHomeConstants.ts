import type { ShiftType } from "../types/employeeHomeTypes";

// 2025年11月の祝日
export const holidays2025Nov = [3, 23, 24]; // 文化の日、勤労感謝の日、振替休日

// シフト時間
export const shiftTimes: Record<ShiftType, string> = {
  "早番": "8:00 - 17:00",
  "遅番": "10:00 - 19:00",
  "夜勤": "17:00 - 翌9:00"
};

// 施設イベント（モックデータ - 管理側で設定可能）
export const facilityEvents = new Map<number, { title: string; description: string; time?: string }>([
  [12, { title: "全体会議", description: "月次全体会議を開催します", time: "10:00 - 11:30" }],
  [20, { title: "避難訓練", description: "消防訓練を実施します", time: "14:00 - 15:00" }],
  [25, { title: "クリスマスイベント", description: "入居者様とのクリスマス会", time: "15:00 - 17:00" }],
]);

// デフォルトのヘッダー画像URL
export const DEFAULT_HEADER_IMAGE_URL = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080";
