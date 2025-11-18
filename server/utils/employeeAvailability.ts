/**
 * 職員の勤務可能時間を優先順位付きで計算
 *
 * 優先順位:
 * 1. leaveRequest（休み申請）→ 絶対休み
 * 2. workPreferences（個別の時間指定希望）→ その日・その時間のみ勤務可能
 * 3. employees.workableDays（職員の基本設定）→ デフォルトの勤務可能パターン
 * 4. 上記どれもない場合 → 終日勤務可能
 */

import {
  DayAvailability,
  createAvailabilityFromTime,
  createAllDayAvailability,
  createUnavailability,
  isDateInRange,
} from './timeSlots';

/**
 * 職員の基本情報
 */
export interface Employee {
  id: number;
  name: string;
  workableDays?: WorkableDay[];
  canWorkNightShift: boolean;
  skillLevel: number;
}

/**
 * 勤務可能曜日・時間帯設定
 */
export interface WorkableDay {
  dayOfWeek: number; // 0=日曜, 1=月曜, ..., 6=土曜
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

/**
 * 休み申請
 */
export interface LeaveRequest {
  id: number;
  employeeId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  leaveType: '休' | '有休';
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * 時間指定勤務希望
 */
export interface WorkPreference {
  id: number;
  employeeId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * 職員の勤務可能時間を計算（優先順位付き）
 *
 * @param employeeId 職員ID
 * @param date 日付（YYYY-MM-DD）
 * @param employees 職員リスト
 * @param leaveRequests 休み申請リスト
 * @param workPreferences 時間指定勤務希望リスト
 * @returns 勤務可能配列（48個のブール値）、または null（終日休み）
 */
export function getEmployeeAvailability(
  employeeId: number,
  date: string,
  employees: Employee[],
  leaveRequests: LeaveRequest[],
  workPreferences: WorkPreference[]
): DayAvailability | null {

  // 優先順位1: 休み申請チェック → 絶対休み
  const approvedLeave = leaveRequests.find(lr =>
    lr.employeeId === employeeId &&
    (lr.status === 'approved' || lr.status === 'pending') &&
    isDateInRange(date, lr.startDate, lr.endDate)
  );

  if (approvedLeave) {
    return null; // 終日休み
  }

  // 優先順位2: 個別の時間指定希望チェック
  const approvedWorkPref = workPreferences.find(wp =>
    wp.employeeId === employeeId &&
    (wp.status === 'approved' || wp.status === 'pending') &&
    isDateInRange(date, wp.startDate, wp.endDate)
  );

  if (approvedWorkPref) {
    // その時間のみ勤務可能
    return createAvailabilityFromTime(approvedWorkPref.startTime, approvedWorkPref.endTime);
  }

  // 優先順位3: 職員の基本設定（workableDays）チェック
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    // 職員が見つからない場合は勤務不可
    return null;
  }

  if (!employee.workableDays || employee.workableDays.length === 0) {
    // workableDaysが設定されていない場合は終日勤務可能
    return createAllDayAvailability();
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜

  const dayConfig = employee.workableDays.find(wd => wd.dayOfWeek === dayOfWeek);

  if (!dayConfig) {
    // その曜日の設定がない = その曜日は勤務不可 → 休み
    return null;
  }

  // その曜日の設定時間で勤務可能
  return createAvailabilityFromTime(dayConfig.startTime, dayConfig.endTime);
}

/**
 * 複数職員の勤務可能時間を一括計算
 *
 * @param employeeIds 職員IDリスト
 * @param date 日付（YYYY-MM-DD）
 * @param employees 職員リスト
 * @param leaveRequests 休み申請リスト
 * @param workPreferences 時間指定勤務希望リスト
 * @returns Map<職員ID, 勤務可能配列 | null>
 */
export function getMultipleEmployeeAvailability(
  employeeIds: number[],
  date: string,
  employees: Employee[],
  leaveRequests: LeaveRequest[],
  workPreferences: WorkPreference[]
): Map<number, DayAvailability | null> {
  const result = new Map<number, DayAvailability | null>();

  for (const employeeId of employeeIds) {
    const availability = getEmployeeAvailability(
      employeeId,
      date,
      employees,
      leaveRequests,
      workPreferences
    );
    result.set(employeeId, availability);
  }

  return result;
}

/**
 * 勤務可能時間の理由を取得（デバッグ・表示用）
 *
 * @param employeeId 職員ID
 * @param date 日付（YYYY-MM-DD）
 * @param employees 職員リスト
 * @param leaveRequests 休み申請リスト
 * @param workPreferences 時間指定勤務希望リスト
 * @returns 理由文字列
 */
export function getAvailabilityReason(
  employeeId: number,
  date: string,
  employees: Employee[],
  leaveRequests: LeaveRequest[],
  workPreferences: WorkPreference[]
): string {
  // 休み申請チェック
  const approvedLeave = leaveRequests.find(lr =>
    lr.employeeId === employeeId &&
    (lr.status === 'approved' || lr.status === 'pending') &&
    isDateInRange(date, lr.startDate, lr.endDate)
  );

  if (approvedLeave) {
    return `休み申請（${approvedLeave.leaveType}）`;
  }

  // 時間指定希望チェック
  const approvedWorkPref = workPreferences.find(wp =>
    wp.employeeId === employeeId &&
    (wp.status === 'approved' || wp.status === 'pending') &&
    isDateInRange(date, wp.startDate, wp.endDate)
  );

  if (approvedWorkPref) {
    return `時間指定勤務希望（${approvedWorkPref.startTime}-${approvedWorkPref.endTime}）`;
  }

  // workableDaysチェック
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    return '職員情報なし';
  }

  if (!employee.workableDays || employee.workableDays.length === 0) {
    return '終日勤務可能（制限なし）';
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const dayConfig = employee.workableDays.find(wd => wd.dayOfWeek === dayOfWeek);

  if (!dayConfig) {
    return '勤務不可曜日';
  }

  return `基本設定（${dayConfig.startTime}-${dayConfig.endTime}）`;
}
