/**
 * 時間関連のユーティリティ関数（30分刻みシステム）
 * 1日を48コマ（30分刻み）で管理
 */

/**
 * 時間文字列（HH:MM）をコマ番号（0-47）に変換
 * @example "00:00" → 0, "00:30" → 1, "13:00" → 26, "23:30" → 47
 */
export function timeToSlot(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return 0;
  return hour * 2 + (minute >= 30 ? 1 : 0);
}

/**
 * コマ番号（0-47）を時間文字列（HH:MM）に変換
 * @example 0 → "00:00", 26 → "13:00", 47 → "23:30"
 */
export function slotToTime(slot: number): string {
  if (slot < 0 || slot > 47) return "00:00";
  const hour = Math.floor(slot / 2);
  const minute = slot % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/**
 * 1日の勤務可能性を48個のブール値配列で表現
 * @example [false, false, ..., true, true, ...] (48個)
 */
export type DayAvailability = boolean[];

/**
 * 時間範囲から勤務可能配列を生成
 * @param startTime 開始時刻（HH:MM）
 * @param endTime 終了時刻（HH:MM）
 * @returns 48個のブール値配列（該当時間帯がtrue）
 */
export function createAvailabilityFromTime(startTime: string, endTime: string): DayAvailability {
  const availability: DayAvailability = new Array(48).fill(false);
  const startSlot = timeToSlot(startTime);
  const endSlot = timeToSlot(endTime);

  for (let slot = startSlot; slot < endSlot; slot++) {
    if (slot >= 0 && slot < 48) {
      availability[slot] = true;
    }
  }

  return availability;
}

/**
 * 終日勤務可能な配列を生成
 * @returns 48個すべてtrueの配列
 */
export function createAllDayAvailability(): DayAvailability {
  return new Array(48).fill(true);
}

/**
 * 勤務不可（休み）を表す配列
 * @returns 48個すべてfalseの配列
 */
export function createUnavailability(): DayAvailability {
  return new Array(48).fill(false);
}

/**
 * 勤務可能配列から最初と最後の勤務可能時間を取得
 * @param availability 勤務可能配列
 * @returns { startTime: "HH:MM", endTime: "HH:MM" } または null（勤務不可の場合）
 */
export function getAvailabilityTimeRange(availability: DayAvailability): { startTime: string; endTime: string } | null {
  const firstTrue = availability.findIndex(v => v);
  const lastTrue = availability.lastIndexOf(true);

  if (firstTrue === -1 || lastTrue === -1) return null;

  return {
    startTime: slotToTime(firstTrue),
    endTime: slotToTime(lastTrue + 1), // +1 because we want the end time of the last slot
  };
}

/**
 * 時間文字列が30分刻みかどうかを検証
 * @param time 時間文字列（HH:MM）
 * @returns true: 30分刻み、false: それ以外
 */
export function isValidTimeSlot(time: string): boolean {
  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute !== 0 && minute !== 30) return false;
  return true;
}

/**
 * 時間範囲が有効かどうかを検証（開始 < 終了）
 * @param startTime 開始時刻（HH:MM）
 * @param endTime 終了時刻（HH:MM）
 * @returns true: 有効、false: 無効
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return timeToSlot(startTime) < timeToSlot(endTime);
}

/**
 * 日付が範囲内にあるかチェック
 * @param date チェック対象日（YYYY-MM-DD）
 * @param startDate 開始日（YYYY-MM-DD）
 * @param endDate 終了日（YYYY-MM-DD）
 * @returns true: 範囲内、false: 範囲外
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const targetDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return targetDate >= start && targetDate <= end;
}

/**
 * 曜日番号を日本語名に変換
 * @param dayOfWeek 0=日曜, 1=月曜, ..., 6=土曜
 * @returns 日本語の曜日名
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[dayOfWeek] || '';
}
