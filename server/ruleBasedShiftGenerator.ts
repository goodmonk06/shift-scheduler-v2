/**
 * ルールベースシフト生成モジュール（夜勤3日セット対応版）
 *
 * availableSlotsを100%遵守し、公平性とスキルバランスを考慮して
 * 決定論的にシフトを生成します。
 *
 * 夜勤ルール: 夜(16:00-00:00) → 明(00:00-09:00) → 休 の3日セット
 */

import type { AvailableSlotsData } from './availableSlotsCalculator';
import type { ShiftGenerationPrompt, ShiftGenerationOutput, ShiftAssignmentOutput } from './shiftGenerator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NIGHT_SHIFT_START_ID = 4;  // 夜勤(16:00-00:00)
const NIGHT_SHIFT_FOLLOWUP_ID = 5;  // 夜勤明け(00:00-09:00)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 内部型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface EmployeeState {
  id: number;
  name: string;
  skillLevel: number;
  canWorkNightShift: boolean;
  workDays: number;  // これまでの勤務日数
  restDays: number;  // 休日数
  nightShifts: number;  // 夜勤回数
  lastWorkDate: string | null;  // 最後の勤務日
  consecutiveDays: number;  // 現在の連続勤務日数
  maxConsecutiveDays: number;  // 最大連続勤務日数
  assignedDates: Set<string>;  // 配置済み日付
  nightShiftFollowupDate: string | null;  // 夜勤明けが予定されている日付
  mustRestDate: string | null;  // 夜勤後の休み日
}

interface NightShiftReservation {
  employeeId: number;
  followupDate: string;  // 明けの日
  restDate: string;  // 休みの日
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ヘルパー関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 日付文字列から次の日を取得
 */
function getNextDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * 日付文字列からN日後を取得
 */
function getDateAfter(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * 2つの日付が連続しているかチェック
 */
function isConsecutive(date1: string | null, date2: string): boolean {
  if (!date1) return false;
  return getNextDate(date1) === date2;
}

/**
 * 日付範囲を生成
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * 職員状態を初期化
 */
function initializeEmployeeStates(
  employees: ShiftGenerationPrompt['employees'],
  maxConsecutiveDays: number
): Map<number, EmployeeState> {
  const states = new Map<number, EmployeeState>();

  for (const emp of employees) {
    states.set(emp.id, {
      id: emp.id,
      name: emp.name,
      skillLevel: emp.skillLevel,
      canWorkNightShift: emp.canWorkNightShift,
      workDays: 0,
      restDays: 0,
      nightShifts: 0,
      lastWorkDate: null,
      consecutiveDays: 0,
      maxConsecutiveDays,
      assignedDates: new Set(),
      nightShiftFollowupDate: null,
      mustRestDate: null,
    });
  }

  return states;
}

/**
 * 職員状態を更新
 */
function updateEmployeeState(
  state: EmployeeState,
  date: string,
  isNightShift: boolean
): void {
  // 連続勤務日数の更新
  if (isConsecutive(state.lastWorkDate, date)) {
    state.consecutiveDays++;
  } else {
    state.consecutiveDays = 1;
  }

  state.workDays++;
  state.lastWorkDate = date;
  state.assignedDates.add(date);

  if (isNightShift) {
    state.nightShifts++;
  }
}

/**
 * 統計情報を計算
 */
function calculateStatistics(
  states: Map<number, EmployeeState>,
  totalDays: number
): ShiftGenerationOutput['statistics'] {
  const employeeStats = Array.from(states.values()).map(state => ({
    employeeId: state.id,
    workDays: state.workDays,
    restDays: totalDays - state.workDays,
    nightShifts: state.nightShifts,
    consecutiveMaxDays: state.consecutiveDays,
  }));

  const totalAssignments = employeeStats.reduce((sum, s) => sum + s.workDays, 0);

  return {
    totalAssignments,
    employeeStats,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メイン処理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ルールベースでシフトを生成（夜勤3日セット対応）
 */
export function generateShiftRuleBased(
  data: ShiftGenerationPrompt
): ShiftGenerationOutput {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 ルールベースシフト生成開始 (夜勤3日セット対応)');
  console.log(`期間: ${data.period.startDate} 〜 ${data.period.endDate}`);
  console.log(`職員: ${data.employees.length}人`);
  console.log(`勤務時間枠: ${data.workTimeSlots.length}枠`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const assignments: ShiftAssignmentOutput[] = [];
  const dates = generateDateRange(data.period.startDate, data.period.endDate);
  const employeeStates = initializeEmployeeStates(
    data.employees,
    data.workplaceRules.maxConsecutiveDays
  );

  // 日付ごとの夜勤予約を管理
  const nightShiftReservations = new Map<string, number>();  // date -> employeeId

  console.log(`1️⃣ 日付範囲: ${dates.length}日間\n`);

  let totalSlotsNeeded = 0;
  let totalSlotsFilled = 0;

  // 日付順にループ
  for (const date of dates) {
    console.log(`📅 ${date}:`);
    const dailyAssignments = new Set<number>();  // その日に配置済みの職員ID

    // 時間枠順にループ（時刻順）
    const sortedTimeSlots = [...data.workTimeSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    for (const timeSlot of sortedTimeSlots) {
      const needed = timeSlot.requiredStaff;
      totalSlotsNeeded += needed;

      // 夜勤明け(ID:5)の場合、予約された職員を自動配置
      if (timeSlot.id === NIGHT_SHIFT_FOLLOWUP_ID && nightShiftReservations.has(date)) {
        const reservedEmployeeId = nightShiftReservations.get(date)!;
        const emp = data.employees.find(e => e.id === reservedEmployeeId);

        if (emp) {
          assignments.push({
            employeeId: emp.id,
            date: date,
            timeSlotId: timeSlot.id,
          });

          dailyAssignments.add(emp.id);
          totalSlotsFilled++;

          // 状態更新
          const state = employeeStates.get(emp.id)!;
          updateEmployeeState(state, date, true);  // 夜勤明けも夜勤扱い
          state.nightShiftFollowupDate = null;  // 予約クリア

          console.log(`   ✅ ${timeSlot.name.padEnd(12)} (${timeSlot.startTime}-${timeSlot.endTime}): ${emp.name} (夜勤明け予約)`);
          continue;
        }
      }

      // 候補職員を選出
      const candidates = data.employees.filter(emp => {
        // 1. availableSlotsに含まれる
        const availableForDate = data.availableSlots[emp.id]?.[date] ?? [];
        if (!availableForDate.includes(timeSlot.id)) {
          return false;
        }

        // 2. その日にまだ配置されていない
        if (dailyAssignments.has(emp.id)) {
          return false;
        }

        const state = employeeStates.get(emp.id)!;

        // 3. 夜勤後の休み日でないか
        if (state.mustRestDate === date) {
          return false;
        }

        // 4. 夜勤明けが予約されている日は他の勤務に配置しない
        if (state.nightShiftFollowupDate === date) {
          return false;
        }

        // 5. 連続勤務日数が上限未満
        if (isConsecutive(state.lastWorkDate, date)) {
          if (state.consecutiveDays >= state.maxConsecutiveDays) {
            return false;
          }
        }

        // 6. 夜勤(ID:4)の場合、翌日と翌々日が期間内か確認
        if (timeSlot.id === NIGHT_SHIFT_START_ID) {
          const followupDate = getDateAfter(date, 1);
          const restDate = getDateAfter(date, 2);

          // 翌日が期間内かつavailableSlotsに明けが含まれているか
          if (dates.includes(followupDate)) {
            const followupAvailable = data.availableSlots[emp.id]?.[followupDate] ?? [];
            if (!followupAvailable.includes(NIGHT_SHIFT_FOLLOWUP_ID)) {
              return false;
            }
          }
        }

        return true;
      });

      // 候補をソート（優先順位）
      candidates.sort((a, b) => {
        const stateA = employeeStates.get(a.id)!;
        const stateB = employeeStates.get(b.id)!;

        // 特別制約: 髙野 幹成 (ID: 17) は最後に配置
        // "ほぼ入れない" ようにするため、候補リストの最後に回す
        const MINIMAL_SCHEDULE_EMPLOYEE_ID = 17; // 髙野 幹成
        if (a.id === MINIMAL_SCHEDULE_EMPLOYEE_ID) return 1;
        if (b.id === MINIMAL_SCHEDULE_EMPLOYEE_ID) return -1;

        // 1. 勤務日数が少ない順（公平性）
        if (stateA.workDays !== stateB.workDays) {
          return stateA.workDays - stateB.workDays;
        }

        // 2. 夜勤の場合、夜勤回数が少ない順
        if (timeSlot.isNightShift) {
          if (stateA.nightShifts !== stateB.nightShifts) {
            return stateA.nightShifts - stateB.nightShifts;
          }
        }

        // 3. スキルレベルが高い順
        if (a.skillLevel !== b.skillLevel) {
          return b.skillLevel - a.skillLevel;
        }

        // 4. ID順（安定ソート）
        return a.id - b.id;
      });

      // 必要人数分選択
      const assigned: number[] = [];
      for (let i = 0; i < needed && i < candidates.length; i++) {
        const emp = candidates[i];

        assignments.push({
          employeeId: emp.id,
          date: date,
          timeSlotId: timeSlot.id,
        });

        dailyAssignments.add(emp.id);
        assigned.push(emp.id);
        totalSlotsFilled++;

        // 状態更新
        const state = employeeStates.get(emp.id)!;
        updateEmployeeState(state, date, timeSlot.isNightShift);

        // 夜勤(ID:4)の場合、3日セットを予約
        if (timeSlot.id === NIGHT_SHIFT_START_ID) {
          const followupDate = getDateAfter(date, 1);
          const restDate = getDateAfter(date, 2);

          if (dates.includes(followupDate)) {
            state.nightShiftFollowupDate = followupDate;
            nightShiftReservations.set(followupDate, emp.id);
          }

          if (dates.includes(restDate)) {
            state.mustRestDate = restDate;
          }

          console.log(`   🌙 夜勤3日セット: ${emp.name} (${date}夜 → ${followupDate}明 → ${restDate}休)`);
        }
      }

      const shortage = needed - assigned.length;
      const status = shortage === 0 ? '✅' : '⚠️';

      if (timeSlot.id !== NIGHT_SHIFT_FOLLOWUP_ID || !nightShiftReservations.has(date)) {
        console.log(
          `   ${status} ${timeSlot.name.padEnd(12)} (${timeSlot.startTime}-${timeSlot.endTime}): ${assigned.length}/${needed}人` +
          (shortage > 0 ? ` [不足: ${shortage}人]` : '')
        );
      }
    }

    console.log('');
  }

  // 休日数を計算
  for (const state of employeeStates.values()) {
    state.restDays = dates.length - state.workDays;
  }

  const statistics = calculateStatistics(employeeStates, dates.length);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ルールベースシフト生成完了');
  console.log(`配置総数: ${assignments.length}件`);
  console.log(`必要枠数: ${totalSlotsNeeded}件`);
  console.log(`充足率: ${((totalSlotsFilled / totalSlotsNeeded) * 100).toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 警告チェック
  const warnings: string[] = [];
  if (totalSlotsFilled < totalSlotsNeeded) {
    warnings.push(`人数不足: ${totalSlotsNeeded - totalSlotsFilled}枠が未配置`);
  }

  // 勤務日数の偏りチェック
  const workDays = Array.from(employeeStates.values()).map(s => s.workDays);
  const avgWorkDays = workDays.reduce((sum, d) => sum + d, 0) / workDays.length;
  const maxDeviation = Math.max(...workDays.map(d => Math.abs(d - avgWorkDays)));
  if (maxDeviation > 2) {
    warnings.push(`勤務日数の偏りあり: 平均${avgWorkDays.toFixed(1)}日、最大偏差${maxDeviation.toFixed(1)}日`);
  }

  return {
    assignments,
    explanation: {
      summary: `ルールベースアルゴリズムで${dates.length}日間、${assignments.length}件の配置を生成しました。公平性とスキルバランスを考慮し、availableSlots制約と夜勤3日セットルールを100%遵守しています。`,
      optimization: [
        '勤務日数が少ない職員を優先的に配置（公平性）',
        '夜勤可能な職員間で夜勤回数を均等化',
        'スキルレベルの高い職員を各日に分散配置',
        `連続勤務は最大${data.workplaceRules.maxConsecutiveDays}日に制限`,
        '夜勤は「夜 → 明 → 休」の3日セットで自動配置',
      ],
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    statistics,
  };
}

/**
 * シフト生成の統計情報を表示
 */
export function printShiftStatistics(output: ShiftGenerationOutput): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 シフト統計情報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`配置総数: ${output.statistics.totalAssignments}件\n`);

  console.log('職員別統計:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('職員ID | 勤務日数 | 休日数 | 夜勤回数 | 最大連続勤務');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  output.statistics.employeeStats.forEach((stat) => {
    console.log(
      `${String(stat.employeeId).padStart(6)} | ${String(stat.workDays).padStart(8)} | ${String(stat.restDays).padStart(6)} | ${String(stat.nightShifts).padStart(8)} | ${String(stat.consecutiveMaxDays).padStart(12)}`
    );
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 平均値計算
  const avgWorkDays =
    output.statistics.employeeStats.reduce((sum, s) => sum + s.workDays, 0) /
    output.statistics.employeeStats.length;
  const avgNightShifts =
    output.statistics.employeeStats.reduce((sum, s) => sum + s.nightShifts, 0) /
    output.statistics.employeeStats.length;

  console.log(`平均勤務日数: ${avgWorkDays.toFixed(1)}日`);
  console.log(`平均夜勤回数: ${avgNightShifts.toFixed(1)}回`);
  console.log('');
}
