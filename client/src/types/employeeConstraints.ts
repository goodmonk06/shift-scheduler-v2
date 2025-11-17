/**
 * 職員の個別勤務条件の型定義
 * AI自動生成時に参照されるJSON構造
 */

/**
 * 曜日ごとの勤務パターン
 */
export interface WeeklyPattern {
  monday?: DayConstraint;
  tuesday?: DayConstraint;
  wednesday?: DayConstraint;
  thursday?: DayConstraint;
  friday?: DayConstraint;
  saturday?: DayConstraint;
  sunday?: DayConstraint;
}

/**
 * 曜日の制約タイプ
 */
export type DayConstraint =
  | "work"              // 通常勤務
  | "off"               // 休み
  | "offOrNightShift"   // 休みまたは夜勤のみ
  | "nightShiftOnly"    // 夜勤のみ
  | { startTime: string; endTime: string; breakMinutes?: number }; // 固定時間勤務

/**
 * シフトタイプの制約
 */
export interface ShiftTypeConstraints {
  allowed?: string[];    // 許可されたシフトタイプ（例：["夜勤", "早番", "日勤A", "日勤B"]）
  forbidden?: string[];  // 禁止されたシフトタイプ（例：["遅番"]）
}

/**
 * 複数の勤務パターン（例：月16日は8-16時、月2日は9-15時）
 */
export interface WorkPattern {
  startTime: string;          // 開始時刻（HH:MM）
  endTime: string;            // 終了時刻（HH:MM）
  daysPerMonth?: number;      // 月の勤務日数
  daysPerWeek?: number;       // 週の勤務日数
  breakMinutes?: number;      // 休憩時間（分）
  description?: string;       // 説明（例：「基本勤務」「サブ勤務」）
}

/**
 * 固定曜日スケジュール（特定の曜日に固定時間で勤務）
 */
export interface FixedSchedule {
  monday?: FixedDaySchedule;
  tuesday?: FixedDaySchedule;
  wednesday?: FixedDaySchedule;
  thursday?: FixedDaySchedule;
  friday?: FixedDaySchedule;
  saturday?: FixedDaySchedule;
  sunday?: FixedDaySchedule;
}

export interface FixedDaySchedule {
  startTime: string;      // 開始時刻（HH:MM）
  endTime: string;        // 終了時刻（HH:MM）
  breakMinutes?: number;  // 休憩時間（分）
}

/**
 * 特殊ルール
 */
export interface SpecialRules {
  canDoConsecutiveNightShifts?: boolean;  // 連続夜勤可能
  nightShiftPattern?: string;              // 夜勤パターンの説明
  weekendWorkFollowedByRest?: boolean;     // 土日出勤した場合、翌週土日は休み
  description?: string;                     // その他の特殊ルール説明
}

/**
 * 職員の個別勤務条件（JSON構造）
 */
export interface EmployeeWorkConstraints {
  // 曜日ごとのパターン
  weeklyPattern?: WeeklyPattern;

  // シフトタイプの制約
  shiftTypeConstraints?: ShiftTypeConstraints;

  // 複数の勤務パターン
  workPatterns?: WorkPattern[];

  // 固定曜日スケジュール
  fixedSchedule?: FixedSchedule;

  // 月間目標労働時間
  monthlyHoursTarget?: number;

  // 週の勤務日数
  weeklyWorkDays?: number;

  // 週の休日数
  weeklyOffDays?: number;

  // 月の勤務日数
  monthlyWorkDays?: number;

  // 個別の最大連勤日数（職場ルールを上書き）
  maxConsecutiveDays?: number;

  // 祝日休み
  holidayOff?: boolean;

  // 土日休み
  weekendOff?: boolean;

  // 土日祝日休み
  weekendAndHolidayOff?: boolean;

  // 特殊ルール
  specialRules?: SpecialRules;

  // 備考（本人希望シフトなど）
  notes?: string;
}

/**
 * デフォルトの空の制約
 */
export const emptyConstraints: EmployeeWorkConstraints = {};

/**
 * 制約が設定されているかチェック
 */
export function hasConstraints(constraints: EmployeeWorkConstraints | null | undefined): boolean {
  if (!constraints) return false;
  return Object.keys(constraints).length > 0;
}

/**
 * AI用の読み取りやすい説明文を生成
 */
export function generateConstraintDescription(constraints: EmployeeWorkConstraints): string {
  const parts: string[] = [];

  // 曜日パターン
  if (constraints.weeklyPattern) {
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    dayKeys.forEach((key, index) => {
      const pattern = constraints.weeklyPattern?.[key as keyof WeeklyPattern];
      if (pattern === "off") {
        parts.push(`${days[index]}曜日：休み`);
      } else if (pattern === "offOrNightShift") {
        parts.push(`${days[index]}曜日：休みまたは夜勤のみ`);
      } else if (typeof pattern === "object") {
        parts.push(`${days[index]}曜日：${pattern.startTime}-${pattern.endTime}`);
      }
    });
  }

  // 固定スケジュール
  if (constraints.fixedSchedule) {
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    dayKeys.forEach((key, index) => {
      const schedule = constraints.fixedSchedule?.[key as keyof FixedSchedule];
      if (schedule) {
        parts.push(`${days[index]}曜日：${schedule.startTime}-${schedule.endTime}勤務`);
      }
    });
  }

  // シフトタイプ制約
  if (constraints.shiftTypeConstraints?.forbidden) {
    parts.push(`${constraints.shiftTypeConstraints.forbidden.join("・")}なし`);
  }

  // 勤務パターン
  if (constraints.workPatterns && constraints.workPatterns.length > 0) {
    constraints.workPatterns.forEach((pattern, index) => {
      if (pattern.daysPerMonth) {
        parts.push(
          `パターン${index + 1}：${pattern.startTime}-${pattern.endTime}勤務 月${pattern.daysPerMonth}日`
        );
      }
    });
  }

  // 週・月の勤務日数
  if (constraints.weeklyWorkDays) {
    parts.push(`週${constraints.weeklyWorkDays}日勤務`);
  }
  if (constraints.monthlyWorkDays) {
    parts.push(`月${constraints.monthlyWorkDays}日勤務`);
  }

  // 月間労働時間
  if (constraints.monthlyHoursTarget) {
    parts.push(`月${constraints.monthlyHoursTarget}時間労働`);
  }

  // 休日
  if (constraints.weekendAndHolidayOff) {
    parts.push("土日祝日休み");
  } else if (constraints.weekendOff) {
    parts.push("土日休み");
  } else if (constraints.holidayOff) {
    parts.push("祝日休み");
  }

  // 特殊ルール
  if (constraints.specialRules?.nightShiftPattern) {
    parts.push(constraints.specialRules.nightShiftPattern);
  }

  // 備考
  if (constraints.notes) {
    parts.push(constraints.notes);
  }

  return parts.join("、");
}
