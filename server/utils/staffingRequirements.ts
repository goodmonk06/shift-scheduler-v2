/**
 * 必要人数を30分刻みで計算
 */

import { DayAvailability, timeToSlot } from './timeSlots';

/**
 * 時間枠（既存の早番・遅番など）
 */
export interface WorkTimeSlot {
  id: number;
  name: string;
  displayLabel: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isNightShift: boolean;
  requiredStaff: number; // この時間枠に必要な人数
}

/**
 * 必要人数設定（時間帯別）
 */
export interface RequiredStaffing {
  id: number;
  shiftId: number;
  dayOfWeek: number; // 0=日曜, 1=月曜, ..., 6=土曜
  hour: number;      // 0-23時
  requiredCount: number;
}

/**
 * 30分刻みの必要人数配列（48コマ）
 * 各コマにその時間帯に必要な人数を格納
 */
export type StaffingRequirements = number[]; // length = 48

/**
 * 日付の必要人数を30分刻みで計算
 *
 * @param date 日付（YYYY-MM-DD）
 * @param workTimeSlots 時間枠リスト
 * @param requiredStaffingRules 必要人数設定リスト
 * @returns 48個の必要人数配列
 */
export function calculateStaffingRequirements(
  date: string,
  workTimeSlots: WorkTimeSlot[],
  requiredStaffingRules: RequiredStaffing[]
): StaffingRequirements {
  const requirements: StaffingRequirements = new Array(48).fill(0);

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  // 方法1: requiredStaffingRulesから計算（時間帯別の必要人数）
  const dayRules = requiredStaffingRules.filter(r => r.dayOfWeek === dayOfWeek);

  for (const rule of dayRules) {
    const hourStartSlot = rule.hour * 2; // 0-47
    const hourEndSlot = hourStartSlot + 2; // 1時間 = 2コマ

    for (let slot = hourStartSlot; slot < hourEndSlot && slot < 48; slot++) {
      requirements[slot] = Math.max(requirements[slot], rule.requiredCount);
    }
  }

  // 方法2: workTimeSlotsから計算（時間枠別の必要人数）
  // これは補完的に使用（requiredStaffingRulesが設定されていない場合）
  for (const timeSlot of workTimeSlots) {
    const startSlot = timeToSlot(timeSlot.startTime);
    const endSlot = timeToSlot(timeSlot.endTime);

    for (let slot = startSlot; slot < endSlot && slot < 48; slot++) {
      // 既存の値とどちらか大きい方を採用
      requirements[slot] = Math.max(requirements[slot], timeSlot.requiredStaff);
    }
  }

  return requirements;
}

/**
 * 現在の配置状況を30分刻みで計算
 *
 * @param assignments 配置リスト（その日のシフト）
 * @returns 48個の配置済み人数配列
 */
export interface ShiftAssignment {
  employeeId: number;
  date: string;
  timeSlotId: number | null;
  startTime: string | null; // カスタム時間の場合
  endTime: string | null;   // カスタム時間の場合
  status: 'working' | 'off' | 'requested_off' | 'emergency_off';
  skillLevel?: number; // 0.5人前なら50、1人前なら100
}

export function calculateCurrentStaffing(
  assignments: ShiftAssignment[],
  workTimeSlots: WorkTimeSlot[]
): StaffingRequirements {
  const staffing: StaffingRequirements = new Array(48).fill(0);

  for (const assignment of assignments) {
    if (assignment.status !== 'working') {
      continue; // 勤務中以外はカウントしない
    }

    let startSlot: number;
    let endSlot: number;

    if (assignment.timeSlotId !== null) {
      // 既存の時間枠を使用
      const timeSlot = workTimeSlots.find(ts => ts.id === assignment.timeSlotId);
      if (!timeSlot) continue;

      startSlot = timeToSlot(timeSlot.startTime);
      endSlot = timeToSlot(timeSlot.endTime);
    } else if (assignment.startTime && assignment.endTime) {
      // カスタム時間
      startSlot = timeToSlot(assignment.startTime);
      endSlot = timeToSlot(assignment.endTime);
    } else {
      continue; // 時間情報がない
    }

    // スキルレベル考慮（50=0.5人分、100=1人分）
    const staffValue = (assignment.skillLevel || 100) / 100;

    for (let slot = startSlot; slot < endSlot && slot < 48; slot++) {
      staffing[slot] += staffValue;
    }
  }

  return staffing;
}

/**
 * 不足人数を計算
 *
 * @param requirements 必要人数配列
 * @param currentStaffing 現在の配置人数配列
 * @returns 不足人数配列（負の値は超過）
 */
export function calculateShortage(
  requirements: StaffingRequirements,
  currentStaffing: StaffingRequirements
): StaffingRequirements {
  const shortage: StaffingRequirements = new Array(48).fill(0);

  for (let slot = 0; slot < 48; slot++) {
    shortage[slot] = requirements[slot] - currentStaffing[slot];
  }

  return shortage;
}

/**
 * 充足率を計算
 *
 * @param requirements 必要人数配列
 * @param currentStaffing 現在の配置人数配列
 * @returns 充足率（0.0 ~ 1.0以上）
 */
export function calculateFulfillmentRate(
  requirements: StaffingRequirements,
  currentStaffing: StaffingRequirements
): number {
  let totalRequired = 0;
  let totalProvided = 0;

  for (let slot = 0; slot < 48; slot++) {
    if (requirements[slot] > 0) {
      totalRequired += requirements[slot];
      totalProvided += Math.min(currentStaffing[slot], requirements[slot]);
    }
  }

  if (totalRequired === 0) return 1.0; // 必要人数が0なら100%

  return totalProvided / totalRequired;
}

/**
 * 最も不足している時間帯を取得
 *
 * @param requirements 必要人数配列
 * @param currentStaffing 現在の配置人数配列
 * @param topN 上位N件
 * @returns { slot: コマ番号, shortage: 不足人数 }[]
 */
export function getMostShortageSlots(
  requirements: StaffingRequirements,
  currentStaffing: StaffingRequirements,
  topN: number = 5
): Array<{ slot: number; shortage: number; time: string }> {
  const shortages = calculateShortage(requirements, currentStaffing);

  const result: Array<{ slot: number; shortage: number; time: string }> = [];

  for (let slot = 0; slot < 48; slot++) {
    if (shortages[slot] > 0) {
      const hour = Math.floor(slot / 2);
      const minute = slot % 2 === 0 ? '00' : '30';
      const time = `${String(hour).padStart(2, '0')}:${minute}`;

      result.push({
        slot,
        shortage: shortages[slot],
        time,
      });
    }
  }

  // 不足人数の多い順にソート
  result.sort((a, b) => b.shortage - a.shortage);

  return result.slice(0, topN);
}
