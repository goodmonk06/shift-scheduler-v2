/**
 * 時間スロットベースシフト生成モジュール
 *
 * 1日を48個の30分スロット(00:00-00:30, 00:30-01:00, ...)に分割し、
 * 各職員の勤務可能時間帯と職場ルールを考慮してシフトを生成します。
 */

import type { AvailableSlotsData } from './availableSlotsCalculator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 30分単位の時間スロット（0-47）
 * 0: 00:00-00:30, 1: 00:30-01:00, ..., 47: 23:30-00:00
 */
type TimeSlotIndex = number; // 0-47

/**
 * シフトタイプとその占有時間スロット
 */
interface ShiftTypeDefinition {
  id: number;
  name: string;           // 「夜勤入り」
  displayLabel: string;   // 「夜」
  timeSlots: TimeSlotIndex[]; // このシフトが占有する時間スロット
  requiredStaff: number;  // 必要人数
  isNightShift?: boolean;
}

/**
 * 職員の勤務可能性マトリクス
 */
interface EmployeeAvailabilityMatrix {
  employeeId: number;
  employeeName: string;
  // date -> timeSlot -> 勤務可能かどうか
  availability: Map<string, boolean[]>;
  positionGroupId: number;
  minDaysOff: number;       // 最低休日数
  canWorkNightShift: boolean;
}

/**
 * 配置結果
 */
interface TimeSlotAssignment {
  date: string;
  employeeId: number;
  shiftTypeId: number;
  shiftName: string;
  shiftLabel: string;
  timeSlots: TimeSlotIndex[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ヘルパー関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 時刻文字列(HH:MM)を時間スロットインデックスに変換
 */
export function timeToSlotIndex(time: string): TimeSlotIndex {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 2 + (minutes >= 30 ? 1 : 0);
}

/**
 * 時間スロットインデックスを時刻文字列に変換
 */
export function slotIndexToTime(index: TimeSlotIndex): string {
  const hours = Math.floor(index / 2);
  const minutes = (index % 2) * 30;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 開始・終了時刻から時間スロットの配列を生成
 * 注: 深夜をまたぐ場合も考慮（例: 16:00-00:00）
 */
export function getTimeSlotRange(startTime: string, endTime: string): TimeSlotIndex[] {
  const startSlot = timeToSlotIndex(startTime);
  let endSlot = timeToSlotIndex(endTime);

  // 00:00は翌日の0時として扱う
  if (endTime === "00:00") {
    endSlot = 48;
  }

  const slots: TimeSlotIndex[] = [];

  if (startSlot < endSlot) {
    // 通常のケース（同日内）
    for (let i = startSlot; i < endSlot; i++) {
      slots.push(i % 48);
    }
  } else {
    // 深夜をまたぐケース
    for (let i = startSlot; i < 48; i++) {
      slots.push(i);
    }
    for (let i = 0; i < endSlot; i++) {
      slots.push(i);
    }
  }

  return slots;
}

/**
 * シフトタイプの定義を作成
 */
export function createShiftTypeDefinitions(): ShiftTypeDefinition[] {
  return [
    {
      id: 4,
      name: "夜勤入り",
      displayLabel: "夜",
      timeSlots: getTimeSlotRange("16:00", "00:00"),
      requiredStaff: 1,
      isNightShift: true
    },
    {
      id: 5,
      name: "夜勤明け",
      displayLabel: "明",
      timeSlots: getTimeSlotRange("00:00", "09:00"),
      requiredStaff: 0, // 自動配置
      isNightShift: true
    },
    {
      id: 7,
      name: "早番",
      displayLabel: "早",
      timeSlots: getTimeSlotRange("06:00", "15:00"),
      requiredStaff: 2
    },
    {
      id: 8,
      name: "日勤A",
      displayLabel: "日A",
      timeSlots: getTimeSlotRange("08:00", "17:00"),
      requiredStaff: 2
    },
    {
      id: 9,
      name: "日勤B",
      displayLabel: "日B",
      timeSlots: getTimeSlotRange("09:00", "18:00"),
      requiredStaff: 2
    },
    {
      id: 10,
      name: "遅番",
      displayLabel: "遅",
      timeSlots: getTimeSlotRange("11:00", "20:00"),
      requiredStaff: 2
    }
  ];
}

/**
 * 職員の勤務可能性マトリクスを作成
 */
export function createAvailabilityMatrix(
  employee: any,
  dates: string[],
  availableSlots: AvailableSlotsData,
  shiftTypes: ShiftTypeDefinition[]
): EmployeeAvailabilityMatrix {
  const matrix: EmployeeAvailabilityMatrix = {
    employeeId: employee.id,
    employeeName: employee.name,
    availability: new Map(),
    positionGroupId: employee.positionGroupId,
    minDaysOff: employee.minDaysOff || 0,
    canWorkNightShift: employee.canWorkNightShift || false
  };

  // 各日付について
  for (const date of dates) {
    const dayAvailability = new Array(48).fill(false);

    // availableSlotsからこの職員が勤務可能なシフトタイプを取得
    const availableShifts = availableSlots[employee.id]?.[date] || [];

    // 各勤務可能シフトタイプの時間スロットをマーク
    for (const shiftTypeId of availableShifts) {
      const shiftDef = shiftTypes.find(s => s.id === shiftTypeId);
      if (shiftDef) {
        for (const slotIndex of shiftDef.timeSlots) {
          dayAvailability[slotIndex] = true;
        }
      }
    }

    matrix.availability.set(date, dayAvailability);
  }

  return matrix;
}

/**
 * 既存の割り当て情報
 */
export interface ExistingAssignment {
  date: string;
  employeeId: number;
  shiftTypeId?: number;
  status: 'working' | 'off' | 'requested_off';
  isLocked?: boolean;
  generatedBy?: string;
}

/**
 * 時間スロットベースでシフトを生成
 */
export function generateTimeSlotBasedShift(
  startDate: string,
  endDate: string,
  employees: any[],
  availableSlots: AvailableSlotsData,
  workplaceRules: any,
  existingAssignments: ExistingAssignment[] = []
): TimeSlotAssignment[] {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ 時間スロットベースシフト生成開始');
  console.log(`期間: ${startDate} 〜 ${endDate}`);
  console.log(`職員: ${employees.length}人`);
  console.log(`既存の割り当て: ${existingAssignments.length}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const assignments: TimeSlotAssignment[] = [];
  const shiftTypes = createShiftTypeDefinitions();

  // 既存割り当てをマップ化（高速検索用）
  const existingMap = new Map<string, ExistingAssignment>();
  existingAssignments.forEach(a => {
    const key = `${a.date}_${a.employeeId}`;
    existingMap.set(key, a);
  });

  // 日付リストを生成
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // 各職員の勤務可能性マトリクスを作成
  const employeeMatrices = employees.map(emp =>
    createAvailabilityMatrix(emp, dates, availableSlots, shiftTypes)
  );

  // 職員の勤務日数と休日数を追跡
  const employeeStats = new Map<number, { workDays: number, offDays: number }>();
  employees.forEach(emp => {
    employeeStats.set(emp.id, { workDays: 0, offDays: 0 });
  });

  // 各日付について処理
  for (const date of dates) {
    console.log(`\n📅 ${date}:`);

    // この日の時間スロット占有状況（48スロット × 職員配置）
    const daySlotOccupancy = new Map<TimeSlotIndex, Set<number>>();
    for (let i = 0; i < 48; i++) {
      daySlotOccupancy.set(i, new Set());
    }

    // シフトタイプごとに必要人数を配置
    for (const shiftType of shiftTypes) {
      if (shiftType.requiredStaff === 0) {
        // 自動配置（夜勤明けなど）はスキップ
        continue;
      }

      let assigned = 0;
      const targetStaff = shiftType.requiredStaff;

      // 配置可能な職員をスコアリング
      const candidates = employeeMatrices
        .filter(matrix => {
          // 既存の不変割り当てがある場合はスキップ
          const existingKey = `${date}_${matrix.employeeId}`;
          const existing = existingMap.get(existingKey);
          if (existing && (existing.isLocked || existing.generatedBy === 'leave_request')) {
            return false;
          }

          // 夜勤の場合は資格確認
          if (shiftType.isNightShift && !matrix.canWorkNightShift) {
            return false;
          }

          // この日この時間帯に勤務可能か
          const dayAvail = matrix.availability.get(date);
          if (!dayAvail) return false;

          // すべての時間スロットで勤務可能か確認
          return shiftType.timeSlots.every(slot => {
            // 既に他のシフトで占有されていないか
            const occupied = daySlotOccupancy.get(slot);
            if (occupied?.has(matrix.employeeId)) return false;
            // 勤務可能か
            return dayAvail[slot];
          });
        })
        .map(matrix => {
          const stats = employeeStats.get(matrix.employeeId)!;
          const daysInMonth = dates.length;

          // スコア計算（勤務日数が少ない職員を優先）
          let score = 1000;
          score -= stats.workDays * 10;

          // 最低休日数を守る必要がある場合
          const remainingDays = daysInMonth - stats.workDays - stats.offDays;
          const neededOffDays = matrix.minDaysOff - stats.offDays;
          if (neededOffDays > remainingDays) {
            score -= 500; // 休日不足の可能性
          }

          return { matrix, score };
        })
        .sort((a, b) => b.score - a.score);

      // 必要人数分配置
      for (const candidate of candidates) {
        if (assigned >= targetStaff) break;

        const { matrix } = candidate;

        // 配置を記録
        assignments.push({
          date,
          employeeId: matrix.employeeId,
          shiftTypeId: shiftType.id,
          shiftName: shiftType.name,
          shiftLabel: shiftType.displayLabel,
          timeSlots: shiftType.timeSlots
        });

        // 時間スロットを占有
        for (const slot of shiftType.timeSlots) {
          daySlotOccupancy.get(slot)!.add(matrix.employeeId);
        }

        // 統計を更新
        const stats = employeeStats.get(matrix.employeeId)!;
        stats.workDays++;

        assigned++;
        console.log(`   ✅ ${shiftType.displayLabel}: ${matrix.employeeName}`);
      }

      if (assigned < targetStaff) {
        console.log(`   ⚠️ ${shiftType.displayLabel}: ${assigned}/${targetStaff}人のみ配置`);
      }
    }

    // この日勤務しなかった職員は休日カウント
    for (const emp of employees) {
      const hasWork = assignments.some(a => a.date === date && a.employeeId === emp.id);
      if (!hasWork) {
        const stats = employeeStats.get(emp.id)!;
        stats.offDays++;
      }
    }
  }

  // 統計情報を表示
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 生成統計');
  console.log(`総配置数: ${assignments.length}`);

  const shiftCounts = new Map<string, number>();
  assignments.forEach(a => {
    const key = a.shiftLabel;
    shiftCounts.set(key, (shiftCounts.get(key) || 0) + 1);
  });

  console.log('\nシフト別:');
  for (const [label, count] of shiftCounts) {
    console.log(`  ${label}: ${count}件`);
  }

  console.log('\n職員別勤務日数（上位5名）:');
  const sortedStats = Array.from(employeeStats.entries())
    .sort((a, b) => b[1].workDays - a[1].workDays)
    .slice(0, 5);

  for (const [empId, stats] of sortedStats) {
    const emp = employees.find(e => e.id === empId);
    console.log(`  ${emp?.name}: 勤務${stats.workDays}日, 休日${stats.offDays}日`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return assignments;
}

/**
 * 時間スロット配置をShiftDetailレコードに変換
 */
export function convertToShiftDetails(
  assignments: TimeSlotAssignment[],
  shiftId: number
): any[] {
  return assignments.map(assignment => ({
    shiftId,
    employeeId: assignment.employeeId,  // フィールド名を修正
    date: assignment.date,
    status: 'working',  // 必須フィールドを追加
    timeSlotId: assignment.shiftTypeId,
    generatedBy: 'rule_based',  // 既存のenumに合わせる
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}