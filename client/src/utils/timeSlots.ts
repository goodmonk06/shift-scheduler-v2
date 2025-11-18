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
 * 30分刻みの時間選択肢を生成（HH:MM形式の配列）
 * @param startSlot 開始コマ番号（デフォルト: 0）
 * @param endSlot 終了コマ番号（デフォルト: 47）
 * @returns ["00:00", "00:30", "01:00", ..., "23:30"]
 */
export function generateTimeOptions(startSlot: number = 0, endSlot: number = 47): string[] {
  const options: string[] = [];
  for (let slot = startSlot; slot <= endSlot; slot++) {
    options.push(slotToTime(slot));
  }
  return options;
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
    availability[slot] = true;
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
 * 勤務可能配列から最初と最後の勤務可能時間を取得
 * @param availability 勤務可能配列
 * @returns { startTime: "HH:MM", endTime: "HH:MM" } または null
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
 * 曜日番号を日本語名に変換
 * @param dayOfWeek 0=日曜, 1=月曜, ..., 6=土曜
 * @returns 日本語の曜日名
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[dayOfWeek] || '';
}

/**
 * 曜日名の配列を取得
 * @returns ["日", "月", "火", "水", "木", "金", "土"]
 */
export function getAllDayNames(): string[] {
  return ['日', '月', '火', '水', '木', '金', '土'];
}
