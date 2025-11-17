/**
 * 配置可能枠の計算モジュール
 *
 * 全職員 × 全日付について、配置可能な勤務時間枠を事前計算
 */

import { getDb } from "./db";
import { employees, positionGroups, workTimeSlots, leaveRequests, shiftDetails } from "../drizzle/schema";
import { and, gte, lte, or, eq } from "drizzle-orm";
import type { EmployeeConstraints } from "../shared/employeeConstraintTypes";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AvailableSlotsData {
  // 職員ID → 日付 → 配置可能な勤務時間枠ID配列
  [employeeId: number]: {
    [date: string]: number[];
  };
}

interface Employee {
  id: number;
  name: string;
  canWorkNightShift: boolean;
  skillLevel: number;
  minDaysOffPerMonth: number;
  additionalConstraints: EmployeeConstraints | null;
}

interface WorkTimeSlot {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
}

interface LeaveRequest {
  employeeId: number;
  startDate: Date;
  endDate: Date;
  status: string;
}

interface ShiftDetail {
  employeeId: number;
  date: string | Date;
  timeSlotId: number | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 日付範囲を生成
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * 指定された日付に希望休があるかチェック
 */
function hasLeaveRequest(
  employeeId: number,
  date: string,
  leaveRequests: LeaveRequest[]
): boolean {
  return leaveRequests.some(lr => {
    if (lr.employeeId !== employeeId) return false;
    if (lr.status !== 'approved' && lr.status !== 'pending') return false;

    const targetDate = new Date(date);
    const startDate = new Date(lr.startDate);
    const endDate = new Date(lr.endDate);

    return targetDate >= startDate && targetDate <= endDate;
  });
}

/**
 * 連続勤務日数をチェック
 */
function getConsecutiveWorkDays(
  employeeId: number,
  date: string,
  existingShifts: ShiftDetail[]
): number {
  const targetDate = new Date(date);
  let consecutiveDays = 0;

  // 前日から遡ってカウント
  for (let i = 1; i <= 10; i++) {
    const checkDate = new Date(targetDate);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    const hasShift = existingShifts.some(
      s => s.employeeId === employeeId &&
           (typeof s.date === 'string'
             ? s.date === checkDateStr
             : new Date(s.date).toISOString().split('T')[0] === checkDateStr)
    );

    if (hasShift) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}

/**
 * 日付が祝日かチェック（簡易版）
 */
function isHoliday(date: string): boolean {
  // 2025年の祝日リスト
  const holidays2025 = [
    '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23',
    '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04',
    '2025-05-05', '2025-07-21', '2025-08-11', '2025-09-15',
    '2025-09-22', '2025-09-23', '2025-10-13', '2025-11-03',
    '2025-11-23', '2025-11-24'
  ];
  return holidays2025.includes(date);
}

/**
 * 時間枠が指定された時間範囲内かチェック
 */
function isSlotWithinTimeRange(
  slot: WorkTimeSlot,
  startTime: string,
  endTime: string
): boolean {
  const slotStart = slot.startTime;
  const slotEnd = slot.endTime;

  // HH:MM形式を数値に変換（例: "09:00" → 540）
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const slotStartMin = toMinutes(slotStart);
  const slotEndMin = toMinutes(slotEnd);
  const constraintStartMin = toMinutes(startTime);
  const constraintEndMin = toMinutes(endTime);

  // 終了時刻が開始時刻より前の場合（例: 夜勤 16:00-09:00）
  const slotCrossesMidnight = slotEndMin < slotStartMin;
  const constraintCrossesMidnight = constraintEndMin < constraintStartMin;

  if (slotCrossesMidnight || constraintCrossesMidnight) {
    // 複雑なケースは保留（現状は日勤のみ想定）
    return true;
  }

  // 時間枠が制約範囲内に完全に収まっているかチェック
  return slotStartMin >= constraintStartMin && slotEndMin <= constraintEndMin;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メイン処理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 配置可能な勤務時間枠を計算（単一職員・単一日付）
 */
function calculateAvailableSlots(
  employee: Employee,
  date: string,
  existingShifts: ShiftDetail[],
  allSlots: WorkTimeSlot[],
  leaveRequests: LeaveRequest[]
): { availableSlotIds: number[], reasons: Record<number, string> } {
  const availableSlotIds: number[] = [];
  const reasons: Record<number, string> = {};

  const constraints = employee.additionalConstraints;
  const dayOfWeek = new Date(date).getDay();  // 0=日曜, 6=土曜

  // ━━━ 優先度100: 絶対厳守（LLMの考慮外） ━━━

  // チェック0: 希望休
  if (hasLeaveRequest(employee.id, date, leaveRequests)) {
    return {
      availableSlotIds: [],
      reasons: { 0: '希望休（厳守）' }
    };
  }

  // チェック1: 有給休暇（取得済み）
  const paidLeaveTaken = constraints?.leaveAllowances?.paidLeave?.takenDates?.find(
    d => d.date === date
  );
  if (paidLeaveTaken) {
    return {
      availableSlotIds: [],
      reasons: { 0: '有給休暇（厳守）' }
    };
  }

  // チェック2: 誕生日休暇（取得済み）
  const birthdayLeaveTaken = constraints?.leaveAllowances?.birthdayLeave?.takenDates?.find(
    d => d.date === date
  );
  if (birthdayLeaveTaken) {
    return {
      availableSlotIds: [],
      reasons: { 0: '誕生日休暇（厳守）' }
    };
  }

  // チェック3: 季節休暇（取得済み）
  const summerLeaveTaken = constraints?.leaveAllowances?.seasonalLeave?.summer?.takenDates?.find(
    d => d.date === date
  );
  const winterLeaveTaken = constraints?.leaveAllowances?.seasonalLeave?.winter?.takenDates?.find(
    d => d.date === date
  );
  if (summerLeaveTaken || winterLeaveTaken) {
    return {
      availableSlotIds: [],
      reasons: { 0: '季節休暇（厳守）' }
    };
  }

  // チェック4: 曜日制約（day_off_pattern: 土日祝日休みなど）
  const dayOffPattern = constraints?.workConstraints?.find(
    c => c.type === 'day_off_pattern' && c.isActive
  );
  if (dayOffPattern) {
    const isDayOff = dayOffPattern.dayOfWeek?.includes(dayOfWeek);
    const isHolidayOff = dayOffPattern.includeHolidays && isHoliday(date);

    if (isDayOff || isHolidayOff) {
      return {
        availableSlotIds: [],
        reasons: { 0: `${dayOffPattern.description}（厳守）` }
      };
    }
  }

  // チェック5: 特定曜日休み（specific_day_off: 火曜日休みなど）
  const specificDayOff = constraints?.workConstraints?.find(
    c => c.type === 'specific_day_off' && c.isActive && c.dayOfWeek?.includes(dayOfWeek)
  );
  if (specificDayOff) {
    return {
      availableSlotIds: [],
      reasons: { 0: `${specificDayOff.description}（厳守）` }
    };
  }

  // ━━━ 各勤務時間枠をチェック ━━━

  for (const slot of allSlots) {
    // チェック6: 夜勤資格
    if (slot.isNightShift && !employee.canWorkNightShift) {
      reasons[slot.id] = '夜勤資格なし（厳守）';
      continue;
    }

    // チェック7: 全般的な勤務時間制約（work_hours: 9:00-14:00のみなど）
    const workHoursConstraint = constraints?.workConstraints?.find(
      c => c.type === 'work_hours' && c.isActive
    );
    if (workHoursConstraint && workHoursConstraint.startTime && workHoursConstraint.endTime) {
      if (!isSlotWithinTimeRange(slot, workHoursConstraint.startTime, workHoursConstraint.endTime)) {
        reasons[slot.id] = `${workHoursConstraint.description}（厳守）`;
        continue;
      }
    }

    // チェック8: 特定曜日の勤務時間制約（specific_day_hours: 水曜・土曜 11:00-20:00など）
    const specificDayHours = constraints?.workConstraints?.find(
      c => c.type === 'specific_day_hours' && c.isActive && c.dayOfWeek?.includes(dayOfWeek)
    );
    if (specificDayHours && specificDayHours.startTime && specificDayHours.endTime) {
      if (!isSlotWithinTimeRange(slot, specificDayHours.startTime, specificDayHours.endTime)) {
        reasons[slot.id] = `${specificDayHours.description}（厳守）`;
        continue;
      }
    }

    // チェック9: 連続勤務上限
    const consecutiveDays = getConsecutiveWorkDays(employee.id, date, existingShifts);
    if (consecutiveDays >= 4) {
      reasons[slot.id] = `連続勤務上限（現在${consecutiveDays}日連続）（厳守）`;
      continue;
    }

    // チェック10: 1日1シフトまで
    const alreadyAssigned = existingShifts.some(
      s => s.employeeId === employee.id &&
           (typeof s.date === 'string'
             ? s.date === date
             : new Date(s.date).toISOString().split('T')[0] === date)
    );
    if (alreadyAssigned) {
      reasons[slot.id] = 'この日は既に配置済み（厳守）';
      continue;
    }

    // ━━━ すべてクリア → LLMの選択肢に含める ━━━
    availableSlotIds.push(slot.id);
    reasons[slot.id] = '✅ 配置可能';
  }

  return { availableSlotIds, reasons };
}

/**
 * 指定期間の全職員 × 全日付について配置可能枠を計算
 */
export async function calculateAllAvailableSlots(
  startDate: string,
  endDate: string
): Promise<AvailableSlotsData> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 配置可能枠の一括計算');
  console.log(`期間: ${startDate} 〜 ${endDate}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 1. データ取得
  console.log('1️⃣ データ取得...');

  const employeesData = await db
    .select({
      id: employees.id,
      name: employees.name,
      canWorkNightShift: employees.canWorkNightShift,
      skillLevel: employees.skillLevel,
      additionalConstraints: employees.additionalConstraints,
      minDaysOffPerMonth: positionGroups.minDaysOffPerMonth,
    })
    .from(employees)
    .innerJoin(positionGroups, eq(employees.positionGroupId, positionGroups.id));

  const slotsData = await db
    .select()
    .from(workTimeSlots)
    .orderBy(workTimeSlots.startTime);

  const leaveRequestsData = await db
    .select()
    .from(leaveRequests)
    .where(
      or(
        and(
          gte(leaveRequests.startDate, new Date(startDate)),
          lte(leaveRequests.startDate, new Date(endDate))
        ),
        and(
          gte(leaveRequests.endDate, new Date(startDate)),
          lte(leaveRequests.endDate, new Date(endDate))
        )
      )
    );

  const existingShiftsData = await db
    .select()
    .from(shiftDetails)
    .where(
      and(
        gte(shiftDetails.date, startDate),
        lte(shiftDetails.date, endDate)
      )
    );

  console.log(`   職員: ${employeesData.length}人`);
  console.log(`   勤務時間枠: ${slotsData.length}枠`);
  console.log(`   希望休: ${leaveRequestsData.length}件`);
  console.log(`   既存シフト: ${existingShiftsData.length}件\n`);

  // 2. 型変換
  const employeesList: Employee[] = employeesData.map(e => ({
    id: e.id,
    name: e.name,
    canWorkNightShift: e.canWorkNightShift,
    skillLevel: e.skillLevel,
    minDaysOffPerMonth: e.minDaysOffPerMonth,
    additionalConstraints: e.additionalConstraints as EmployeeConstraints | null,
  }));

  const slotsList: WorkTimeSlot[] = slotsData;
  const leaveRequestsList: LeaveRequest[] = leaveRequestsData;
  const existingShiftsList: ShiftDetail[] = existingShiftsData;

  // 3. 日付リスト生成
  const dates = generateDateRange(startDate, endDate);
  console.log(`2️⃣ 日付範囲生成: ${dates.length}日間\n`);

  // 4. 全職員 × 全日付について計算
  console.log('3️⃣ 配置可能枠を計算中...');
  const availableSlots: AvailableSlotsData = {};
  let totalCalculations = 0;
  let totalAvailableSlots = 0;

  for (const employee of employeesList) {
    availableSlots[employee.id] = {};

    for (const date of dates) {
      const result = calculateAvailableSlots(
        employee,
        date,
        existingShiftsList,
        slotsList,
        leaveRequestsList
      );
      availableSlots[employee.id][date] = result.availableSlotIds;

      totalCalculations++;
      totalAvailableSlots += result.availableSlotIds.length;
    }
  }

  console.log(`   計算回数: ${totalCalculations}回`);
  console.log(`   配置可能枠合計: ${totalAvailableSlots}枠\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 配置可能枠の計算完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return availableSlots;
}

/**
 * 配置可能枠の統計情報を取得
 */
export function getAvailableSlotsStatistics(availableSlots: AvailableSlotsData) {
  const stats = {
    totalEmployees: 0,
    totalDays: 0,
    totalPossibleSlots: 0,
    employeeStats: [] as Array<{
      employeeId: number;
      availableDays: number;
      totalAvailableSlots: number;
      averageSlotsPerDay: number;
    }>
  };

  for (const [employeeIdStr, dateSlots] of Object.entries(availableSlots)) {
    const employeeId = parseInt(employeeIdStr);
    stats.totalEmployees++;

    const dates = Object.keys(dateSlots);
    stats.totalDays = Math.max(stats.totalDays, dates.length);

    let employeeAvailableDays = 0;
    let employeeTotalSlots = 0;

    for (const [date, slotIds] of Object.entries(dateSlots)) {
      if (slotIds.length > 0) {
        employeeAvailableDays++;
        employeeTotalSlots += slotIds.length;
      }
    }

    stats.totalPossibleSlots += employeeTotalSlots;

    stats.employeeStats.push({
      employeeId,
      availableDays: employeeAvailableDays,
      totalAvailableSlots: employeeTotalSlots,
      averageSlotsPerDay: employeeAvailableDays > 0
        ? employeeTotalSlots / employeeAvailableDays
        : 0
    });
  }

  return stats;
}
