/**
 * シフト検証ロジック
 * 生成されたシフトがすべての制約を満たしているかをチェックする
 */

// ==============================
// 型定義
// ==============================

export interface ValidationError {
  type: "hard_constraint" | "soft_constraint";
  category: string;
  message: string;
  employeeId?: number;
  employeeName?: string;
  date?: string;
  details?: any;
}

export interface ValidationWarning {
  category: string;
  message: string;
  severity: "low" | "medium" | "high";
  employeeId?: number;
  employeeName?: string;
  date?: string;
  details?: any;
}

export interface ValidationMetrics {
  totalCoverage: number; // 人員充足率（%）
  averageSkillLevel: number; // 平均スキルレベル
  fairnessScore: number; // 公平性スコア（0-100）
  constraintViolations: {
    hard: number;
    soft: number;
  };
  workloadDistribution: {
    employeeId: number;
    employeeName: string;
    totalDays: number;
    nightShiftCount: number;
    weekendCount: number;
    totalHours: number;
  }[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

export interface ShiftAssignment {
  employeeId: number;
  date: string; // YYYY-MM-DD
  timeSlotId: number;
}

export interface Employee {
  id: number;
  name: string;
  positionGroupId: number;
  skillLevel: number;
  canWorkNightShift: boolean;
}

export interface WorkTimeSlot {
  id: number;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isNightShift: boolean;
}

export interface RequiredStaffing {
  dayOfWeek: number; // 0-6
  hour: number; // 0-23
  requiredCount: number;
}

export interface LeaveRequest {
  employeeId: number;
  requestDate?: string; // deprecated
  startDate: string;
  endDate: string;
  status: string;
}

export interface EmployeeConstraint {
  employeeId: number;
  constraintType: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  maxValue?: number;
}

export interface WorkplaceRule {
  ruleType: string;
  employmentType: string;
  ruleValue: any;
  description?: string;
  isActive: boolean;
}

export interface PositionGroup {
  id: number;
  name: string;
  employmentType: "fulltime" | "parttime";
}

export interface ValidationContext {
  shifts: ShiftAssignment[];
  employees: Employee[];
  workTimeSlots: WorkTimeSlot[];
  requiredStaffing: RequiredStaffing[];
  leaveRequests: LeaveRequest[];
  employeeConstraints: EmployeeConstraint[];
  workplaceRules: WorkplaceRule[];
  positionGroups: PositionGroup[];
  year: number;
  month: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AvailableSlots ベースのシンプルバリデーション
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AvailableSlotsData {
  [employeeId: number]: {
    [date: string]: number[];
  };
}

export interface SimpleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * availableSlotsに基づくシンプルなバリデーション
 * LLM生成シフトの事前チェック用
 */
export function validateAgainstAvailableSlots(
  assignments: ShiftAssignment[],
  availableSlots: AvailableSlotsData,
  timeSlotRequirements?: Array<{ id: number, name: string, requiredStaff: number }>
): SimpleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 AvailableSlots バリデーション');
  console.log(`配置数: ${assignments.length}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // チェック1: availableSlotsに含まれるか
  console.log('1️⃣ 配置可能枠チェック...');
  let violationCount = 0;

  for (const assignment of assignments) {
    const available = availableSlots[assignment.employeeId]?.[assignment.date] ?? [];

    if (!available.includes(assignment.timeSlotId)) {
      errors.push(
        `職員ID ${assignment.employeeId} は ${assignment.date} に勤務時間枠ID ${assignment.timeSlotId} に配置できません（availableSlots違反）`
      );
      violationCount++;
    }
  }

  if (violationCount > 0) {
    console.log(`   ❌ ${violationCount}件の違反を検出\n`);
  } else {
    console.log('   ✅ 全ての配置がavailableSlotsに含まれています\n');
  }

  // チェック2: 1日1シフト制限
  console.log('2️⃣ 1日1シフト制限チェック...');
  const employeeDateMap = new Map<string, number>();
  let duplicateCount = 0;

  for (const assignment of assignments) {
    const key = `${assignment.employeeId}-${assignment.date}`;
    const count = (employeeDateMap.get(key) ?? 0) + 1;
    employeeDateMap.set(key, count);

    if (count > 1) {
      errors.push(
        `職員ID ${assignment.employeeId} が ${assignment.date} に複数配置されています（${count}回）`
      );
      duplicateCount++;
    }
  }

  if (duplicateCount > 0) {
    console.log(`   ❌ ${duplicateCount}件の重複配置を検出\n`);
  } else {
    console.log('   ✅ 重複配置なし\n');
  }

  // チェック3: 必要人数の充足（警告のみ）
  if (timeSlotRequirements) {
    console.log('3️⃣ 必要人数チェック...');
    const slotAssignmentCounts = new Map<string, {
      timeSlotId: number,
      timeSlotName: string,
      requiredStaff: number,
      assignedStaff: number
    }>();

    for (const assignment of assignments) {
      const key = `${assignment.date}-${assignment.timeSlotId}`;
      const requirement = timeSlotRequirements.find(r => r.id === assignment.timeSlotId);

      if (!slotAssignmentCounts.has(key)) {
        slotAssignmentCounts.set(key, {
          timeSlotId: assignment.timeSlotId,
          timeSlotName: requirement?.name ?? `時間枠${assignment.timeSlotId}`,
          requiredStaff: requirement?.requiredStaff ?? 0,
          assignedStaff: 0
        });
      }

      const slotReq = slotAssignmentCounts.get(key)!;
      slotReq.assignedStaff++;
    }

    let shortageCount = 0;
    let excessCount = 0;

    for (const [key, slotReq] of slotAssignmentCounts.entries()) {
      const [date, timeSlotId] = key.split('-');

      if (slotReq.assignedStaff < slotReq.requiredStaff) {
        warnings.push(
          `${date} ${slotReq.timeSlotName}: 人数不足（必要${slotReq.requiredStaff}人 / 配置${slotReq.assignedStaff}人）`
        );
        shortageCount++;
      } else if (slotReq.assignedStaff > slotReq.requiredStaff) {
        warnings.push(
          `${date} ${slotReq.timeSlotName}: 過剰配置（必要${slotReq.requiredStaff}人 / 配置${slotReq.assignedStaff}人）`
        );
        excessCount++;
      }
    }

    if (shortageCount > 0 || excessCount > 0) {
      console.log(`   ⚠️ 人数不足: ${shortageCount}件、過剰配置: ${excessCount}件\n`);
    } else {
      console.log('   ✅ 必要人数を満たしています\n');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`バリデーション結果: ${errors.length === 0 ? '✅ 合格' : '❌ 不合格'}`);
  console.log(`エラー: ${errors.length}件`);
  console.log(`警告: ${warnings.length}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==============================
// メイン検証関数
// ==============================

export function validateShift(context: ValidationContext): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  console.log("[検証] シフト検証開始", {
    shifts: context.shifts.length,
    employees: context.employees.length,
  });

  // ハード制約のチェック
  errors.push(...validateLeaveRequests(context));
  errors.push(...validateNightShiftQualification(context));
  errors.push(...validateWorkingHours(context));
  errors.push(...validateRestIntervals(context));
  errors.push(...validateConsecutiveWorkDays(context));
  errors.push(...validateEmployeeConstraints(context));

  // ソフト制約のチェック（警告として）
  warnings.push(...validateRequiredStaffing(context)); // 必要人数不足は警告扱い
  warnings.push(...checkFairness(context));
  warnings.push(...checkWorkloadBalance(context));

  // メトリクスの計算
  const metrics = calculateMetrics(context, errors, warnings);

  const isValid = errors.length === 0;

  console.log("[検証] 検証完了", {
    isValid,
    errors: errors.length,
    warnings: warnings.length,
    coverage: metrics.totalCoverage,
  });

  return {
    isValid,
    errors,
    warnings,
    metrics,
  };
}

// ==============================
// ハード制約の検証関数
// ==============================

/**
 * 1. 希望休が守られているかチェック
 */
function validateLeaveRequests(context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { shifts, leaveRequests, employees } = context;

  // 承認済みの希望休のみをチェック
  const approvedLeaveRequests = leaveRequests.filter((lr) => lr.status === "approved");

  for (const leaveRequest of approvedLeaveRequests) {
    const employee = employees.find((e) => e.id === leaveRequest.employeeId);
    if (!employee) continue;

    // 希望休の期間内の日付を列挙
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      // その日にシフトが入っているかチェック
      const assignedShift = shifts.find(
        (s) => s.employeeId === leaveRequest.employeeId && s.date === dateStr
      );

      if (assignedShift) {
        errors.push({
          type: "hard_constraint",
          category: "leave_request_violation",
          message: `希望休の日にシフトが入っています`,
          employeeId: employee.id,
          employeeName: employee.name,
          date: dateStr,
          details: { leaveRequestId: leaveRequest },
        });
      }
    }
  }

  return errors;
}

/**
 * 2. 夜勤資格のチェック
 */
function validateNightShiftQualification(context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { shifts, employees, workTimeSlots } = context;

  for (const shift of shifts) {
    const employee = employees.find((e) => e.id === shift.employeeId);
    const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);

    if (!employee || !timeSlot) continue;

    // 夜勤なのに夜勤資格がない場合
    if (timeSlot.isNightShift && !employee.canWorkNightShift) {
      errors.push({
        type: "hard_constraint",
        category: "night_shift_qualification",
        message: `夜勤資格のない職員が夜勤に配置されています`,
        employeeId: employee.id,
        employeeName: employee.name,
        date: shift.date,
        details: { timeSlotName: timeSlot.name },
      });
    }
  }

  return errors;
}

/**
 * 3. 必要人数が満たされているかチェック
 * ⚠️ 必要人数不足は警告として扱う（ルール違反ではない）
 */
function validateRequiredStaffing(context: ValidationContext): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { shifts, employees, workTimeSlots, requiredStaffing, year, month } = context;

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr).getDay();

    // その日のシフトを取得
    const dayShifts = shifts.filter((s) => s.date === dateStr);

    // 各時間帯の人数をチェック
    for (let hour = 0; hour < 24; hour++) {
      const required = requiredStaffing.find(
        (rs) => rs.dayOfWeek === dayOfWeek && rs.hour === hour
      );

      if (!required || required.requiredCount === 0) continue;

      // その時間に勤務している人数を計算（スキルレベル考慮）
      let actualStaffing = 0;

      for (const shift of dayShifts) {
        const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);
        if (!timeSlot) continue;

        // 時間枠がこの時間をカバーしているかチェック
        const startHour = parseInt(timeSlot.startTime.split(":")[0]);
        const endHour = parseInt(timeSlot.endTime.split(":")[0]);

        // 深夜をまたぐ場合の処理
        const coversHour = (startHour <= endHour)
          ? (hour >= startHour && hour < endHour)
          : (hour >= startHour || hour < endHour);

        if (coversHour) {
          const employee = employees.find((e) => e.id === shift.employeeId);
          if (employee) {
            // スキルレベルを人数換算（100 = 1.0人前）
            actualStaffing += employee.skillLevel / 100;
          }
        }
      }

      // 必要人数に対して80%未満の場合は警告
      const coverageRatio = actualStaffing / required.requiredCount;
      if (coverageRatio < 0.8) {
        warnings.push({
          category: "understaffed",
          message: `必要人数を下回っています（必要: ${required.requiredCount}人、実際: ${actualStaffing.toFixed(1)}人）`,
          severity: coverageRatio < 0.5 ? "high" : coverageRatio < 0.8 ? "medium" : "low",
          date: dateStr,
          details: {
            hour,
            required: required.requiredCount,
            actual: actualStaffing,
            coverage: Math.round(coverageRatio * 100),
          },
        });
      }
    }
  }

  return warnings;
}

/**
 * 4. 労働時間の上限チェック
 */
function validateWorkingHours(context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { shifts, employees, workTimeSlots, positionGroups, year, month } = context;

  const daysInMonth = new Date(year, month, 0).getDate();

  for (const employee of employees) {
    const positionGroup = positionGroups.find((pg) => pg.id === employee.positionGroupId);
    if (!positionGroup) continue;

    // 週ごとに労働時間を計算
    const weeksInMonth = Math.ceil(daysInMonth / 7);

    for (let week = 0; week < weeksInMonth; week++) {
      const weekStart = week * 7 + 1;
      const weekEnd = Math.min(weekStart + 6, daysInMonth);

      let weeklyHours = 0;

      for (let day = weekStart; day <= weekEnd; day++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayShifts = shifts.filter(
          (s) => s.employeeId === employee.id && s.date === dateStr
        );

        for (const shift of dayShifts) {
          const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);
          if (!timeSlot) continue;

          // 労働時間を計算
          const startHour = parseInt(timeSlot.startTime.split(":")[0]);
          const startMinute = parseInt(timeSlot.startTime.split(":")[1]);
          const endHour = parseInt(timeSlot.endTime.split(":")[0]);
          const endMinute = parseInt(timeSlot.endTime.split(":")[1]);

          let hours = endHour - startHour;
          let minutes = endMinute - startMinute;

          if (minutes < 0) {
            hours--;
            minutes += 60;
          }

          // 深夜をまたぐ場合
          if (hours < 0) {
            hours += 24;
          }

          weeklyHours += hours + minutes / 60;
        }
      }

      // 正社員は週40時間まで
      if (positionGroup.employmentType === "fulltime" && weeklyHours > 40) {
        errors.push({
          type: "hard_constraint",
          category: "weekly_hours_exceeded",
          message: `週間労働時間の上限を超えています（週${week + 1}: ${weeklyHours.toFixed(1)}時間）`,
          employeeId: employee.id,
          employeeName: employee.name,
          details: {
            week: week + 1,
            weeklyHours: weeklyHours.toFixed(1),
            limit: 40,
          },
        });
      }
    }
  }

  return errors;
}

/**
 * 5. シフト間インターバルのチェック（最低11時間）
 */
function validateRestIntervals(context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { shifts, employees, workTimeSlots } = context;

  for (const employee of employees) {
    const employeeShifts = shifts
      .filter((s) => s.employeeId === employee.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < employeeShifts.length - 1; i++) {
      const currentShift = employeeShifts[i];
      const nextShift = employeeShifts[i + 1];

      const currentTimeSlot = workTimeSlots.find((ts) => ts.id === currentShift.timeSlotId);
      const nextTimeSlot = workTimeSlots.find((ts) => ts.id === nextShift.timeSlotId);

      if (!currentTimeSlot || !nextTimeSlot) continue;

      // 日付差を計算
      const currentDate = new Date(currentShift.date + "T" + currentTimeSlot.endTime);
      const nextDate = new Date(nextShift.date + "T" + nextTimeSlot.startTime);

      const intervalHours = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60);

      // 11時間未満の場合はエラー
      if (intervalHours < 11) {
        errors.push({
          type: "hard_constraint",
          category: "insufficient_rest_interval",
          message: `シフト間の休憩時間が不足しています（${intervalHours.toFixed(1)}時間）`,
          employeeId: employee.id,
          employeeName: employee.name,
          date: nextShift.date,
          details: {
            previousShiftEnd: currentShift.date + " " + currentTimeSlot.endTime,
            nextShiftStart: nextShift.date + " " + nextTimeSlot.startTime,
            intervalHours: intervalHours.toFixed(1),
            requiredHours: 11,
          },
        });
      }
    }
  }

  return errors;
}

/**
 * 6. 連続勤務日数のチェック
 */
function validateConsecutiveWorkDays(context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { shifts, employees } = context;

  const MAX_CONSECUTIVE_DAYS = 6;

  for (const employee of employees) {
    const employeeShifts = shifts
      .filter((s) => s.employeeId === employee.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    let consecutiveDays = 1;
    let startDate = employeeShifts[0]?.date;

    for (let i = 1; i < employeeShifts.length; i++) {
      const prevDate = new Date(employeeShifts[i - 1].date);
      const currDate = new Date(employeeShifts[i].date);

      // 連続している場合
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        consecutiveDays++;

        if (consecutiveDays > MAX_CONSECUTIVE_DAYS) {
          errors.push({
            type: "hard_constraint",
            category: "excessive_consecutive_days",
            message: `連続勤務日数が上限を超えています（${consecutiveDays}日連続）`,
            employeeId: employee.id,
            employeeName: employee.name,
            date: employeeShifts[i].date,
            details: {
              consecutiveDays,
              startDate,
              endDate: employeeShifts[i].date,
              maxAllowed: MAX_CONSECUTIVE_DAYS,
            },
          });
        }
      } else {
        // 連続が途切れた
        consecutiveDays = 1;
        startDate = employeeShifts[i].date;
      }
    }
  }

  return errors;
}

/**
 * 7. 個人制約のチェック
 */
function validateEmployeeConstraints(context: ValidationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { shifts, employees, employeeConstraints, workTimeSlots } = context;

  for (const constraint of employeeConstraints) {
    const employee = employees.find((e) => e.id === constraint.employeeId);
    if (!employee) continue;

    const employeeShifts = shifts.filter((s) => s.employeeId === constraint.employeeId);

    // 勤務不可曜日のチェック
    if (constraint.constraintType === "unavailable_day" && constraint.dayOfWeek !== undefined) {
      for (const shift of employeeShifts) {
        const dayOfWeek = new Date(shift.date).getDay();
        if (dayOfWeek === constraint.dayOfWeek) {
          errors.push({
            type: "hard_constraint",
            category: "unavailable_day_violation",
            message: `勤務不可曜日にシフトが入っています`,
            employeeId: employee.id,
            employeeName: employee.name,
            date: shift.date,
            details: { dayOfWeek: constraint.dayOfWeek },
          });
        }
      }
    }

    // 勤務不可時間帯のチェック
    if (constraint.constraintType === "unavailable_time" && constraint.startTime && constraint.endTime) {
      for (const shift of employeeShifts) {
        const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);
        if (!timeSlot) continue;

        // 時間の重複チェック（簡易版）
        const shiftStart = timeSlot.startTime;
        const shiftEnd = timeSlot.endTime;
        const constraintStart = constraint.startTime;
        const constraintEnd = constraint.endTime;

        // 重複判定
        if (
          (shiftStart >= constraintStart && shiftStart < constraintEnd) ||
          (shiftEnd > constraintStart && shiftEnd <= constraintEnd) ||
          (shiftStart <= constraintStart && shiftEnd >= constraintEnd)
        ) {
          errors.push({
            type: "hard_constraint",
            category: "unavailable_time_violation",
            message: `勤務不可時間帯にシフトが入っています`,
            employeeId: employee.id,
            employeeName: employee.name,
            date: shift.date,
            details: {
              shiftTime: `${shiftStart}-${shiftEnd}`,
              unavailableTime: `${constraintStart}-${constraintEnd}`,
            },
          });
        }
      }
    }
  }

  return errors;
}

// ==============================
// ソフト制約のチェック（警告）
// ==============================

function checkFairness(context: ValidationContext): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { shifts, employees, workTimeSlots } = context;

  // 夜勤回数の公平性チェック
  const nightShiftCounts: { [employeeId: number]: number } = {};

  for (const shift of shifts) {
    const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);
    if (timeSlot?.isNightShift) {
      nightShiftCounts[shift.employeeId] = (nightShiftCounts[shift.employeeId] || 0) + 1;
    }
  }

  // 夜勤可能な職員の中での偏りをチェック
  const nightShiftCapableEmployees = employees.filter((e) => e.canWorkNightShift);
  const nightShiftCountsList = nightShiftCapableEmployees.map(
    (e) => nightShiftCounts[e.id] || 0
  );

  if (nightShiftCountsList.length > 0) {
    const maxNightShifts = Math.max(...nightShiftCountsList);
    const minNightShifts = Math.min(...nightShiftCountsList);

    if (maxNightShifts - minNightShifts > 2) {
      warnings.push({
        category: "fairness",
        message: `夜勤回数に偏りがあります（最大${maxNightShifts}回、最小${minNightShifts}回）`,
        severity: "medium",
        details: { maxNightShifts, minNightShifts, difference: maxNightShifts - minNightShifts },
      });
    }
  }

  return warnings;
}

function checkWorkloadBalance(context: ValidationContext): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { shifts, employees, positionGroups } = context;

  // 正社員間での勤務日数の公平性チェック
  const fullTimeEmployees = employees.filter((e) => {
    const positionGroup = positionGroups.find((pg) => pg.id === e.positionGroupId);
    return positionGroup?.employmentType === "fulltime";
  });

  const workDayCounts = fullTimeEmployees.map((e) => ({
    employeeId: e.id,
    employeeName: e.name,
    days: shifts.filter((s) => s.employeeId === e.id).length,
  }));

  if (workDayCounts.length > 0) {
    const maxDays = Math.max(...workDayCounts.map((wc) => wc.days));
    const minDays = Math.min(...workDayCounts.map((wc) => wc.days));

    if (maxDays - minDays > 3) {
      warnings.push({
        category: "workload_balance",
        message: `正社員の勤務日数に偏りがあります（最大${maxDays}日、最小${minDays}日）`,
        severity: "medium",
        details: { maxDays, minDays, difference: maxDays - minDays, distribution: workDayCounts },
      });
    }
  }

  return warnings;
}

// ==============================
// メトリクス計算
// ==============================

function calculateMetrics(
  context: ValidationContext,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): ValidationMetrics {
  const { shifts, employees, workTimeSlots, requiredStaffing, year, month } = context;

  // 人員充足率の計算
  let totalCoverage = 0;
  let coverageCount = 0;

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr).getDay();
    const dayShifts = shifts.filter((s) => s.date === dateStr);

    for (let hour = 0; hour < 24; hour++) {
      const required = requiredStaffing.find(
        (rs) => rs.dayOfWeek === dayOfWeek && rs.hour === hour
      );

      if (!required || required.requiredCount === 0) continue;

      let actualStaffing = 0;

      for (const shift of dayShifts) {
        const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);
        if (!timeSlot) continue;

        const startHour = parseInt(timeSlot.startTime.split(":")[0]);
        const endHour = parseInt(timeSlot.endTime.split(":")[0]);
        const coversHour = (startHour <= endHour)
          ? (hour >= startHour && hour < endHour)
          : (hour >= startHour || hour < endHour);

        if (coversHour) {
          const employee = employees.find((e) => e.id === shift.employeeId);
          if (employee) {
            actualStaffing += employee.skillLevel / 100;
          }
        }
      }

      const coverage = Math.min(100, (actualStaffing / required.requiredCount) * 100);
      totalCoverage += coverage;
      coverageCount++;
    }
  }

  const averageCoverage = coverageCount > 0 ? totalCoverage / coverageCount : 0;

  // 平均スキルレベル
  const totalSkillLevel = employees.reduce((sum, e) => sum + e.skillLevel, 0);
  const averageSkillLevel = employees.length > 0 ? totalSkillLevel / employees.length : 0;

  // 公平性スコア（暫定: 制約違反が少ないほど高い）
  const fairnessScore = Math.max(0, 100 - warnings.length * 5);

  // 職員ごとの勤務負荷
  const workloadDistribution = employees.map((employee) => {
    const employeeShifts = shifts.filter((s) => s.employeeId === employee.id);
    const nightShiftCount = employeeShifts.filter((s) => {
      const timeSlot = workTimeSlots.find((ts) => ts.id === s.timeSlotId);
      return timeSlot?.isNightShift;
    }).length;

    const weekendCount = employeeShifts.filter((s) => {
      const dayOfWeek = new Date(s.date).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    }).length;

    // 総労働時間の計算
    let totalHours = 0;
    for (const shift of employeeShifts) {
      const timeSlot = workTimeSlots.find((ts) => ts.id === shift.timeSlotId);
      if (!timeSlot) continue;

      const startHour = parseInt(timeSlot.startTime.split(":")[0]);
      const startMinute = parseInt(timeSlot.startTime.split(":")[1]);
      const endHour = parseInt(timeSlot.endTime.split(":")[0]);
      const endMinute = parseInt(timeSlot.endTime.split(":")[1]);

      let hours = endHour - startHour;
      let minutes = endMinute - startMinute;

      if (minutes < 0) {
        hours--;
        minutes += 60;
      }

      if (hours < 0) {
        hours += 24;
      }

      totalHours += hours + minutes / 60;
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      totalDays: employeeShifts.length,
      nightShiftCount,
      weekendCount,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  });

  return {
    totalCoverage: Math.round(averageCoverage * 10) / 10,
    averageSkillLevel: Math.round(averageSkillLevel),
    fairnessScore: Math.round(fairnessScore),
    constraintViolations: {
      hard: errors.filter((e) => e.type === "hard_constraint").length,
      soft: errors.filter((e) => e.type === "soft_constraint").length,
    },
    workloadDistribution,
  };
}
