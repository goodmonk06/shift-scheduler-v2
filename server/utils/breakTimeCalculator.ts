/**
 * 休憩時間計算ユーティリティ
 * 12月システムのロジックを踏襲し、データベース駆動で動作
 */

import type { BreakTimeRule } from '../../drizzle/schema';

/**
 * 休憩時間を計算
 * @param workHours 勤務時間（時間単位）
 * @param rule 休憩時間ルール
 * @returns 休憩時間（時間単位）
 */
export function calculateBreakTime(
  workHours: number,
  rule: BreakTimeRule | null | undefined
): number {
  // ルールが未設定の場合はデフォルト（6時間超なら1時間）
  if (!rule) {
    return workHours > 6 ? 1 : 0;
  }

  switch (rule.type) {
    case 'fixed':
      // 固定時間（例: 常に1時間）
      return rule.duration || 0;

    case 'conditional':
      // 条件付き（例: 6時間超なら1時間）
      const threshold = rule.threshold || 6;
      const duration = rule.conditionDuration || 1;
      return workHours > threshold ? duration : 0;

    case 'none':
      // 休憩なし
      return 0;

    default:
      // デフォルト
      return workHours > 6 ? 1 : 0;
  }
}

/**
 * 時刻文字列（HH:MM）を時間（小数）に変換
 * @param timeStr 時刻文字列（例: "09:30"）
 * @returns 時間（例: 9.5）
 */
export function parseTimeToHours(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

/**
 * 時間（小数）を時刻文字列（HH:MM）に変換
 * @param hours 時間（例: 9.5）
 * @returns 時刻文字列（例: "09:30"）
 */
export function formatHoursToTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 勤務時間を計算（開始時刻、終了時刻、休憩時間ルールから）
 * @param startTime 開始時刻（HH:MM）
 * @param endTime 終了時刻（HH:MM）
 * @param breakTimeRule 休憩時間ルール
 * @returns 正味勤務時間（時間単位）
 */
export function calculateNetWorkHours(
  startTime: string,
  endTime: string,
  breakTimeRule: BreakTimeRule | null | undefined
): number {
  const start = parseTimeToHours(startTime);
  const end = parseTimeToHours(endTime);

  // 総勤務時間（休憩前）
  let grossHours = end - start;

  // 日付をまたぐ場合（例: 21:00～翌9:00）
  if (grossHours < 0) {
    grossHours += 24;
  }

  // 休憩時間を控除
  const breakHours = calculateBreakTime(grossHours, breakTimeRule);
  const netHours = grossHours - breakHours;

  return netHours > 0 ? netHours : 0;
}
