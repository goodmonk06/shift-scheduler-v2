/**
 * シフト統計計算ユーティリティ
 * 12月システムのロジックを踏襲
 */

import { calculateNetWorkHours } from './breakTimeCalculator';
import type { BreakTimeRule } from '../../drizzle/schema';

export interface ShiftStats {
  days: number;        // 勤務日数
  hours: number;       // 総勤務時間（休憩時間控除後）
  nightCount: number;  // 夜勤回数
  holidays: number;    // 休日数
  paidHolidays: number; // 有給休暇数
}

export interface ShiftDetailForStats {
  date: string;
  displayText: string | null;
  status: 'working' | 'off' | 'requested_off' | 'emergency_off';
  leaveType?: '休' | '有休' | '夏' | '冬' | null;
  startTime?: string | null;
  endTime?: string | null;
  timeSlotId?: number | null;
}

/**
 * シフト統計を計算（12月システムのロジックを踏襲）
 * @param shiftDetails シフト詳細データ
 * @param breakTimeRule 休憩時間ルール
 * @param year 年
 * @param month 月
 * @returns 統計情報
 */
export function calculateShiftStats(
  shiftDetails: ShiftDetailForStats[],
  breakTimeRule: BreakTimeRule | null | undefined,
  year: number,
  month: number
): ShiftStats {
  let days = 0;
  let hours = 0;
  let nightCount = 0;
  let holidays = 0;
  let paidHolidays = 0;

  // 対象月のみフィルタリング
  const targetDetails = shiftDetails.filter(detail => {
    const date = new Date(detail.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  for (const detail of targetDetails) {
    const { displayText, status, leaveType, startTime, endTime } = detail;

    // 休日のカウント
    if (status === 'requested_off' || status === 'off') {
      if (leaveType === '有休') {
        paidHolidays++;
      } else {
        holidays++;
      }
      continue;
    }

    // 勤務日のみカウント（明けも含む）
    if (status === 'working') {
      days++;

      // 夜勤の処理（12月システムと同様）
      if (displayText === '夜' || displayText === 'NIGHT') {
        nightCount++;
        hours += 15; // 夜勤は15時間（休憩2時間控除済み）
        continue;
      }

      // 明けの処理（勤務日数のみカウント、時間は夜勤に吸収）
      if (displayText === '明') {
        continue;
      }

      // 時間指定勤務の処理
      if (startTime && endTime) {
        const netHours = calculateNetWorkHours(startTime, endTime, breakTimeRule);
        hours += netHours;
        continue;
      }

      // 定型シフトの処理（例: "日", "日A", "8～17"など）
      if (displayText) {
        // パターンマッチング: "9～13", "9半～13", "8～14"など
        const match = displayText.match(/(\d+)(半)?～(\d+)(半)?/);
        if (match) {
          const startHour = Number(match[1]) + (match[2] === '半' ? 0.5 : 0);
          const endHour = Number(match[3]) + (match[4] === '半' ? 0.5 : 0);

          const startTimeStr = `${String(Math.floor(startHour)).padStart(2, '0')}:${String((startHour % 1) * 60).padStart(2, '0')}`;
          const endTimeStr = `${String(Math.floor(endHour)).padStart(2, '0')}:${String((endHour % 1) * 60).padStart(2, '0')}`;

          const netHours = calculateNetWorkHours(startTimeStr, endTimeStr, breakTimeRule);
          hours += netHours;
          continue;
        }

        // 定型シフト（例: "日", "日A"など、デフォルト8時間）
        if (displayText === '日' || displayText === '日A' || displayText.startsWith('日')) {
          const grossHours = 8;
          const breakHours = breakTimeRule ?
            (breakTimeRule.type === 'fixed' ? (breakTimeRule.duration || 0) :
             breakTimeRule.type === 'conditional' && grossHours > (breakTimeRule.threshold || 6) ?
               (breakTimeRule.conditionDuration || 0) : 0) :
            (grossHours > 6 ? 1 : 0);
          hours += grossHours - breakHours;
        }
      }
    }
  }

  return {
    days,
    hours: Math.round(hours * 10) / 10, // 小数点1桁に丸める
    nightCount,
    holidays,
    paidHolidays
  };
}

/**
 * 複数職員の統計を一括計算
 * @param shiftDetailsGroupedByEmployee 職員ごとにグループ化されたシフト詳細
 * @param employeeBreakTimeRules 職員ごとの休憩時間ルール
 * @param year 年
 * @param month 月
 * @returns 職員ごとの統計情報
 */
export function calculateStatsForAllEmployees(
  shiftDetailsGroupedByEmployee: Map<number, ShiftDetailForStats[]>,
  employeeBreakTimeRules: Map<number, BreakTimeRule | null>,
  year: number,
  month: number
): Map<number, ShiftStats> {
  const statsMap = new Map<number, ShiftStats>();

  for (const [employeeId, details] of shiftDetailsGroupedByEmployee.entries()) {
    const breakTimeRule = employeeBreakTimeRules.get(employeeId) || null;
    const stats = calculateShiftStats(details, breakTimeRule, year, month);
    statsMap.set(employeeId, stats);
  }

  return statsMap;
}
