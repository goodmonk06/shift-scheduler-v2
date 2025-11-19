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
  additionalConstraints?: AdditionalConstraints;
}

/**
 * 追加制約（パートタイム職員の個別条件）
 */
export interface AdditionalConstraints {
  // 毎週固定パターン（曜日別の休み・勤務・時間指定）
  weeklyFixed?: WeeklyFixedPattern[];
  // 土日祝休み
  holidaysOff?: boolean;
  // 遅番なし
  noLateShift?: boolean;
  // 許可されたシフトタイプ
  allowedShiftTypes?: string[];
  // 月間勤務日数制約
  monthlyDays?: {
    min?: number;
    max?: number;
    target?: number;
  };
  // 月間勤務時間
  monthlyHours?: number;
  // デフォルト勤務時間
  defaultWorkTime?: {
    startTime: string;
    endTime: string;
    endTimeAlt?: string;
  };
  // 勤務可能時間範囲
  workTimeRange?: {
    startTime: string;
    endTime: string;
    duration?: number; // 時間単位
  };
  // 週の勤務日数
  weeklyDays?: number;
  // 本人希望シフトを使用
  useWorkPreferences?: boolean;
  // 最大連続勤務日数
  maxConsecutiveDays?: number;
  // その他の説明
  description?: string;
  // 勤務パターン（複数パターン対応）
  workPatterns?: {
    type: string;
    startTime: string;
    endTime: string;
    daysPerMonth?: number;
  }[];
}

/**
 * 毎週固定パターン
 */
export interface WeeklyFixedPattern {
  dayOfWeek: number; // 0=日, 1=月, ..., 6=土
  type: 'off' | 'must_work' | 'off_or_night' | 'night_forbidden';
  startTime?: string; // must_work の場合の開始時刻
  endTime?: string;   // must_work の場合の終了時刻
  description?: string;
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
 * 日本の祝日判定（簡易版）
 */
function isJapaneseHoliday(date: string): boolean {
  // 2024-2025年の主要な祝日
  const holidays = [
    '2024-01-01', '2024-01-08', '2024-02-11', '2024-02-12', '2024-02-23',
    '2024-03-20', '2024-04-29', '2024-05-03', '2024-05-04', '2024-05-05',
    '2024-05-06', '2024-07-15', '2024-08-11', '2024-08-12', '2024-09-16',
    '2024-09-22', '2024-09-23', '2024-10-14', '2024-11-03', '2024-11-04',
    '2024-11-23', '2024-12-23',
    '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-02-24',
    '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05',
    '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23',
    '2025-10-13', '2025-11-03', '2025-11-23', '2025-11-24', '2025-12-23',
  ];
  return holidays.includes(date);
}

/**
 * 職員の勤務可能時間を計算（優先順位付き + 個別制約対応）
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

  // 職員情報を取得
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    // 職員が見つからない場合は勤務不可
    return null;
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
  const constraints = employee.additionalConstraints;

  // 優先順位1.5: 個別制約 - 毎週固定パターン（休み）
  if (constraints?.weeklyFixed) {
    const fixedPattern = constraints.weeklyFixed.find(
      wf => wf.dayOfWeek === dayOfWeek
    );

    if (fixedPattern) {
      if (fixedPattern.type === 'off') {
        return null; // 毎週この曜日は休み
      }
    }
  }

  // 優先順位1.6: 個別制約 - 土日祝休み
  if (constraints?.holidaysOff) {
    if (dayOfWeek === 0 || dayOfWeek === 6 || isJapaneseHoliday(date)) {
      return null; // 土日祝は休み
    }
  }

  // 優先順位2: 個別の時間指定希望チェック（workPreferences）
  const approvedWorkPref = workPreferences.find(wp =>
    wp.employeeId === employeeId &&
    (wp.status === 'approved' || wp.status === 'pending') &&
    isDateInRange(date, wp.startDate, wp.endDate)
  );

  if (approvedWorkPref) {
    // その時間のみ勤務可能
    return createAvailabilityFromTime(approvedWorkPref.startTime, approvedWorkPref.endTime);
  }

  // 優先順位3: 個別制約 - 毎週固定パターン（勤務必須・時間指定）
  if (constraints?.weeklyFixed) {
    const fixedPattern = constraints.weeklyFixed.find(
      wf => wf.dayOfWeek === dayOfWeek && wf.type === 'must_work'
    );

    if (fixedPattern && fixedPattern.startTime && fixedPattern.endTime) {
      // この曜日は固定時間で勤務必須
      return createAvailabilityFromTime(fixedPattern.startTime, fixedPattern.endTime);
    }
  }

  // 優先順位4: 個別制約 - デフォルト勤務時間
  if (constraints?.defaultWorkTime) {
    return createAvailabilityFromTime(
      constraints.defaultWorkTime.startTime,
      constraints.defaultWorkTime.endTime
    );
  }

  // 優先順位5: 個別制約 - 勤務可能時間範囲
  if (constraints?.workTimeRange) {
    return createAvailabilityFromTime(
      constraints.workTimeRange.startTime,
      constraints.workTimeRange.endTime
    );
  }

  // 優先順位6: 職員の基本設定（workableDays）チェック
  if (!employee.workableDays || employee.workableDays.length === 0) {
    // workableDaysが設定されていない場合は終日勤務可能
    return createAllDayAvailability();
  }

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

  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    return '職員情報なし';
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const constraints = employee.additionalConstraints;

  // 個別制約 - 毎週固定パターン（休み）
  if (constraints?.weeklyFixed) {
    const fixedPattern = constraints.weeklyFixed.find(
      wf => wf.dayOfWeek === dayOfWeek && wf.type === 'off'
    );
    if (fixedPattern) {
      return `毎週固定休み（${fixedPattern.description || '曜日固定'}）`;
    }
  }

  // 個別制約 - 土日祝休み
  if (constraints?.holidaysOff) {
    if (dayOfWeek === 0 || dayOfWeek === 6 || isJapaneseHoliday(date)) {
      return '土日祝休み（個別制約）';
    }
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

  // 個別制約 - 毎週固定パターン（勤務必須）
  if (constraints?.weeklyFixed) {
    const fixedPattern = constraints.weeklyFixed.find(
      wf => wf.dayOfWeek === dayOfWeek && wf.type === 'must_work'
    );
    if (fixedPattern && fixedPattern.startTime && fixedPattern.endTime) {
      return `毎週固定勤務（${fixedPattern.startTime}-${fixedPattern.endTime}）`;
    }
  }

  // 個別制約 - デフォルト勤務時間
  if (constraints?.defaultWorkTime) {
    return `デフォルト勤務時間（${constraints.defaultWorkTime.startTime}-${constraints.defaultWorkTime.endTime}）`;
  }

  // 個別制約 - 勤務可能時間範囲
  if (constraints?.workTimeRange) {
    return `勤務可能時間範囲（${constraints.workTimeRange.startTime}-${constraints.workTimeRange.endTime}）`;
  }

  // workableDaysチェック
  if (!employee.workableDays || employee.workableDays.length === 0) {
    return '終日勤務可能（制限なし）';
  }

  const dayConfig = employee.workableDays.find(wd => wd.dayOfWeek === dayOfWeek);

  if (!dayConfig) {
    return '勤務不可曜日';
  }

  return `基本設定（${dayConfig.startTime}-${dayConfig.endTime}）`;
}
