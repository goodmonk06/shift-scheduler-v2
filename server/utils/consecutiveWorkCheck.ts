/**
 * 連続勤務日数チェック
 *
 * ユーザー要件:
 * - 連続勤務は最大4日まで（5日以上の連続勤務は禁止）
 * - 前後の勤務予定も考慮して、結果的に5連勤にならないこと
 * - 例: 12/6-9に勤務希望がある場合、12/5を埋めると5連勤になるため配置不可
 */

/**
 * シフト情報（簡易版）
 */
export interface ShiftDay {
  date: string; // YYYY-MM-DD
  employeeId: number;
  status: 'working' | 'off' | 'requested_off' | 'emergency_off';
}

/**
 * 連続勤務日数を計算
 *
 * @param employeeId 職員ID
 * @param targetDate 確認したい日付（YYYY-MM-DD）
 * @param existingShifts 既存のシフトリスト
 * @param includeTarget targetDateを含めて計算するか
 * @returns 連続勤務日数
 */
export function getConsecutiveWorkDays(
  employeeId: number,
  targetDate: string,
  existingShifts: ShiftDay[],
  includeTarget: boolean = true
): number {
  const employeeShifts = existingShifts
    .filter(s => s.employeeId === employeeId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const targetDateObj = new Date(targetDate);
  let consecutiveDays = 0;

  // targetDateより前の連続勤務をカウント
  for (let i = 1; i <= 10; i++) {
    const checkDate = new Date(targetDateObj);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    const shift = employeeShifts.find(s => s.date === checkDateStr);

    if (shift && shift.status === 'working') {
      consecutiveDays++;
    } else {
      break; // 勤務がない日が見つかったら終了
    }
  }

  // targetDate自体が勤務日なら+1
  if (includeTarget) {
    const targetShift = employeeShifts.find(s => s.date === targetDate);
    if (targetShift && targetShift.status === 'working') {
      consecutiveDays++;
    } else {
      // 新規配置として扱う
      consecutiveDays++;
    }
  }

  return consecutiveDays;
}

/**
 * targetDateの後に続く連続勤務日数を計算
 *
 * @param employeeId 職員ID
 * @param targetDate 確認したい日付（YYYY-MM-DD）
 * @param existingShifts 既存のシフトリスト
 * @returns 連続勤務日数
 */
export function getFollowingConsecutiveWorkDays(
  employeeId: number,
  targetDate: string,
  existingShifts: ShiftDay[]
): number {
  const employeeShifts = existingShifts
    .filter(s => s.employeeId === employeeId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const targetDateObj = new Date(targetDate);
  let consecutiveDays = 0;

  // targetDateより後の連続勤務をカウント
  for (let i = 1; i <= 10; i++) {
    const checkDate = new Date(targetDateObj);
    checkDate.setDate(checkDate.getDate() + i);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    const shift = employeeShifts.find(s => s.date === checkDateStr);

    if (shift && shift.status === 'working') {
      consecutiveDays++;
    } else {
      break; // 勤務がない日が見つかったら終了
    }
  }

  return consecutiveDays;
}

/**
 * targetDateに配置可能かチェック（連続勤務制限）
 *
 * @param employeeId 職員ID
 * @param targetDate 確認したい日付（YYYY-MM-DD）
 * @param existingShifts 既存のシフトリスト
 * @param maxConsecutiveDays 最大連続勤務日数（デフォルト: 4）
 * @returns { canAssign: boolean, reason: string, totalConsecutive: number }
 */
export function checkConsecutiveWorkLimit(
  employeeId: number,
  targetDate: string,
  existingShifts: ShiftDay[],
  maxConsecutiveDays: number = 4
): {
  canAssign: boolean;
  reason: string;
  totalConsecutive: number;
} {
  // 前方の連続勤務日数
  const previousDays = getConsecutiveWorkDays(employeeId, targetDate, existingShifts, false);

  // 後方の連続勤務日数
  const followingDays = getFollowingConsecutiveWorkDays(employeeId, targetDate, existingShifts);

  // 合計連続勤務日数（前 + 今日 + 後）
  const totalConsecutive = previousDays + 1 + followingDays;

  if (totalConsecutive > maxConsecutiveDays) {
    return {
      canAssign: false,
      reason: `連続勤務制限超過（前${previousDays}日+今日+後${followingDays}日=${totalConsecutive}日、上限${maxConsecutiveDays}日）`,
      totalConsecutive,
    };
  }

  return {
    canAssign: true,
    reason: `連続勤務OK（前${previousDays}日+今日+後${followingDays}日=${totalConsecutive}日）`,
    totalConsecutive,
  };
}

/**
 * 複数の日付を一括でチェック
 *
 * @param employeeId 職員ID
 * @param dates 確認したい日付リスト（YYYY-MM-DD[]）
 * @param existingShifts 既存のシフトリスト
 * @param maxConsecutiveDays 最大連続勤務日数（デフォルト: 4）
 * @returns Map<日付, チェック結果>
 */
export function checkMultipleDates(
  employeeId: number,
  dates: string[],
  existingShifts: ShiftDay[],
  maxConsecutiveDays: number = 4
): Map<string, { canAssign: boolean; reason: string; totalConsecutive: number }> {
  const results = new Map();

  for (const date of dates) {
    const result = checkConsecutiveWorkLimit(employeeId, date, existingShifts, maxConsecutiveDays);
    results.set(date, result);
  }

  return results;
}

/**
 * 月の連続勤務違反をすべて検出
 *
 * @param shifts その月のすべてのシフト
 * @param maxConsecutiveDays 最大連続勤務日数（デフォルト: 4）
 * @returns 違反リスト
 */
export interface ConsecutiveWorkViolation {
  employeeId: number;
  startDate: string;
  endDate: string;
  consecutiveDays: number;
}

export function findConsecutiveWorkViolations(
  shifts: ShiftDay[],
  maxConsecutiveDays: number = 4
): ConsecutiveWorkViolation[] {
  const violations: ConsecutiveWorkViolation[] = [];

  // 職員IDごとにグループ化
  const employeeIds = Array.from(new Set(shifts.map(s => s.employeeId)));

  for (const employeeId of employeeIds) {
    const employeeShifts = shifts
      .filter(s => s.employeeId === employeeId && s.status === 'working')
      .sort((a, b) => a.date.localeCompare(b.date));

    let consecutiveStart: string | null = null;
    let consecutiveCount = 0;
    let lastDate: Date | null = null;

    for (const shift of employeeShifts) {
      const currentDate = new Date(shift.date);

      if (lastDate === null) {
        // 最初の勤務日
        consecutiveStart = shift.date;
        consecutiveCount = 1;
        lastDate = currentDate;
      } else {
        // 前日の翌日かチェック
        const expectedDate = new Date(lastDate);
        expectedDate.setDate(expectedDate.getDate() + 1);

        if (currentDate.getTime() === expectedDate.getTime()) {
          // 連続している
          consecutiveCount++;
          lastDate = currentDate;

          // 違反チェック
          if (consecutiveCount > maxConsecutiveDays) {
            // 既存の違反を更新または新規追加
            const existing = violations.find(
              v => v.employeeId === employeeId && v.startDate === consecutiveStart
            );

            if (existing) {
              existing.endDate = shift.date;
              existing.consecutiveDays = consecutiveCount;
            } else if (consecutiveStart) {
              violations.push({
                employeeId,
                startDate: consecutiveStart,
                endDate: shift.date,
                consecutiveDays: consecutiveCount,
              });
            }
          }
        } else {
          // 連続が途切れた
          consecutiveStart = shift.date;
          consecutiveCount = 1;
          lastDate = currentDate;
        }
      }
    }
  }

  return violations;
}
