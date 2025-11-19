/**
 * 段階的配置アルゴリズム
 *
 * Phase 1: ハード制約の確定（休み、時間指定優先配置）
 * Phase 2: 勤務可能枠の計算（workableDays考慮 + 連続勤務チェック）
 * Phase 3: AI最適化（必要人数充足、公平性考慮）
 */

import * as db from "./db";
import {
  getEmployeeAvailability,
  getAvailabilityReason,
  type Employee as EmployeeAvail,
  type LeaveRequest,
  type WorkPreference
} from "./utils/employeeAvailability";
import {
  checkConsecutiveWorkLimit,
  getConsecutiveWorkDays,
  type ShiftDay
} from "./utils/consecutiveWorkCheck";
import {
  getAvailabilityTimeRange
} from "./utils/timeSlots";

/**
 * Phase 1: ハード制約の確定
 * - 休み申請を確定
 * - 時間指定勤務希望を優先配置
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @returns 確定したシフト詳細リスト
 */
export async function phase1_confirmHardConstraints(
  shiftId: number,
  year: number,
  month: number
): Promise<any[]> {
  console.log('\n=== Phase 1: ハード制約の確定 ===');

  const confirmedShifts: any[] = [];

  // データ取得
  const employees = await db.getAllEmployees();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const workPreferences = await db.getWorkPreferencesByShift(shiftId);

  const daysInMonth = new Date(year, month, 0).getDate();

  // 各日付・各職員について処理
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const employee of employees) {
      // 休み申請チェック
      const leave = leaveRequests.find(lr =>
        lr.employeeId === employee.id &&
        (lr.status === 'approved' || lr.status === 'pending') &&
        isDateInRange(date, lr.startDate, lr.endDate)
      );

      if (leave) {
        // 休み確定
        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'requested_off',
          timeSlotId: null,
          leaveType: leave.leaveType,
          startTime: null,
          endTime: null,
          generatedBy: 'leave_request',
          reason: `休み申請（${leave.leaveType}）`,
        });
        console.log(`  ${date} ${employee.name}: 休み確定（${leave.leaveType}）`);
        continue;
      }

      // 時間指定勤務希望チェック
      const workPref = workPreferences.find(wp =>
        wp.employeeId === employee.id &&
        (wp.status === 'approved' || wp.status === 'pending') &&
        isDateInRange(date, wp.startDate, wp.endDate)
      );

      if (workPref) {
        // 時間指定勤務を優先配置
        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'working',
          timeSlotId: null, // カスタム時間
          leaveType: null,
          startTime: workPref.startTime,
          endTime: workPref.endTime,
          generatedBy: 'rule_based',
          reason: `時間指定勤務希望（${workPref.startTime}-${workPref.endTime}）`,
        });
        console.log(`  ${date} ${employee.name}: 時間指定勤務配置（${workPref.startTime}-${workPref.endTime}）`);
      }
    }
  }

  console.log(`\nPhase 1完了: ${confirmedShifts.length}件のハード制約を確定`);
  return confirmedShifts;
}

/**
 * Phase 2: 勤務可能枠の計算
 * - workableDays考慮
 * - 連続勤務チェック
 * - 法令遵守チェック
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param confirmedShifts Phase 1で確定したシフト
 * @returns 各職員・各日付の勤務可能情報
 */
export async function phase2_calculateAvailability(
  shiftId: number,
  year: number,
  month: number,
  confirmedShifts: any[]
): Promise<Map<string, any>> {
  console.log('\n=== Phase 2: 勤務可能枠の計算 ===');

  const availabilityMap = new Map<string, any>();

  // データ取得
  const employees = await db.getAllEmployees();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const workPreferences = await db.getWorkPreferencesByShift(shiftId);

  // 職員情報を変換
  const employeesAvail: EmployeeAvail[] = employees.map(e => ({
    id: e.id,
    name: e.name,
    workableDays: (e.workableDays as any) || [],
    canWorkNightShift: e.canWorkNightShift || false,
    skillLevel: e.skillLevel || 100,
  }));

  const daysInMonth = new Date(year, month, 0).getDate();

  // ShiftDay形式に変換（連続勤務チェック用）
  const shiftDays: ShiftDay[] = confirmedShifts.map(s => ({
    date: s.date,
    employeeId: s.employeeId,
    status: s.status,
  }));

  // 各日付・各職員について処理
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const employee of employees) {
      const key = `${employee.id}_${date}`;

      // 既にPhase 1で確定している場合はスキップ
      const alreadyConfirmed = confirmedShifts.find(
        s => s.employeeId === employee.id && s.date === date
      );

      if (alreadyConfirmed) {
        availabilityMap.set(key, {
          employeeId: employee.id,
          date,
          availability: null, // 確定済み
          reason: alreadyConfirmed.reason,
          canAssign: false,
        });
        continue;
      }

      // 勤務可能時間を計算（優先順位ロジック）
      const availability = getEmployeeAvailability(
        employee.id,
        date,
        employeesAvail,
        leaveRequests as LeaveRequest[],
        workPreferences as WorkPreference[]
      );

      const reason = getAvailabilityReason(
        employee.id,
        date,
        employeesAvail,
        leaveRequests as LeaveRequest[],
        workPreferences as WorkPreference[]
      );

      // 勤務不可の場合
      if (availability === null) {
        availabilityMap.set(key, {
          employeeId: employee.id,
          date,
          availability: null,
          reason,
          canAssign: false,
        });
        continue;
      }

      // 連続勤務チェック
      const consecutiveCheck = checkConsecutiveWorkLimit(
        employee.id,
        date,
        shiftDays,
        4 // 最大4日まで
      );

      if (!consecutiveCheck.canAssign) {
        availabilityMap.set(key, {
          employeeId: employee.id,
          date,
          availability,
          reason: consecutiveCheck.reason,
          canAssign: false,
        });
        continue;
      }

      // 勤務可能時間の範囲を取得
      const timeRange = getAvailabilityTimeRange(availability);

      availabilityMap.set(key, {
        employeeId: employee.id,
        date,
        availability,
        timeRange,
        reason,
        canAssign: true,
      });
    }
  }

  const canAssignCount = Array.from(availabilityMap.values()).filter(v => v.canAssign).length;
  console.log(`\nPhase 2完了: ${availabilityMap.size}件中${canAssignCount}件が配置可能`);

  return availabilityMap;
}

/**
 * Phase 3: ルールベース配置
 * - 夜勤優先配置（毎日必須）
 * - 夜勤→明け番（休み）のルール適用
 * - その他の時間帯を必要人数に基づいて配置
 * - 公平性を考慮
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param confirmedShifts Phase 1で確定したシフト
 * @param availabilityMap Phase 2で計算した勤務可能情報
 * @returns 生成されたシフト
 */
export async function phase3_ruleBasedAssignment(
  shiftId: number,
  year: number,
  month: number,
  confirmedShifts: any[],
  availabilityMap: Map<string, any>
): Promise<any[]> {
  console.log('\n=== Phase 3: ルールベース配置 ===');

  // データ取得
  const employees = await db.getAllEmployees();
  const workTimeSlots = await db.getAllWorkTimeSlots();
  const requiredStaffing = await db.getAllRequiredStaffing();

  const generatedShifts: any[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  // 夜勤可能職員と夜勤スロット
  const nightShiftCapable = employees.filter(e => e.canWorkNightShift);
  const nightShiftSlots = workTimeSlots.filter(ts => ts.isNightShift);

  console.log(`夜勤可能職員: ${nightShiftCapable.length}名`);
  console.log(`夜勤スロット: ${nightShiftSlots.length}件`);

  // 各職員の勤務日数カウンター（公平性のため）
  const workDayCount = new Map<number, number>();
  employees.forEach(e => workDayCount.set(e.id, 0));

  // ========================================
  // ステップ1: 夜勤の優先配置（全日程）
  // ========================================
  console.log('\n--- ステップ1: 夜勤配置 ---');

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const nightSlot of nightShiftSlots) {
      // 配置可能な候補者を探す
      const candidates = nightShiftCapable.filter(emp => {
        const key = `${emp.id}_${date}`;
        const availability = availabilityMap.get(key);

        // 配置可能でない場合はスキップ
        if (!availability || !availability.canAssign) return false;

        // 既に確定しているシフトがある場合はスキップ
        if (confirmedShifts.some(s => s.employeeId === emp.id && s.date === date)) return false;

        // 既に生成したシフトがある場合はスキップ
        if (generatedShifts.some(s => s.employeeId === emp.id && s.date === date)) return false;

        // 連続勤務制限チェック（夜勤入り〜夜勤明け＝2連勤扱い）
        const allShifts: ShiftDay[] = [...confirmedShifts, ...generatedShifts].map(s => ({
          date: s.date,
          employeeId: s.employeeId,
          status: s.status as 'working' | 'off' | 'requested_off' | 'emergency_off',
        }));

        // 前の連続勤務日数をチェック
        const previousDays = getConsecutiveWorkDays(emp.id, date, allShifts, false);

        // 夜勤入り + 夜勤明け = 2日分なので、前の連続勤務が3日以上の場合はNG（3+2=5連勤）
        if (previousDays >= 3) {
          return false;
        }

        return true;
      });

      if (candidates.length === 0) {
        console.warn(`⚠️ ${date} の夜勤配置不可: 候補者なし`);
        continue;
      }

      // 最も勤務日数が少ない職員を選択（公平性）
      candidates.sort((a, b) => {
        const countA = workDayCount.get(a.id) || 0;
        const countB = workDayCount.get(b.id) || 0;
        return countA - countB;
      });

      const selected = candidates[0];

      // 夜勤を配置
      generatedShifts.push({
        shiftId,
        employeeId: selected.id,
        date,
        status: 'working',
        timeSlotId: nightSlot.id,
        startTime: null,
        endTime: null,
        leaveType: null,
        generatedBy: 'rule_based',
        reason: `夜勤配置（${nightSlot.name}）`,
      });

      // 夜勤入り + 夜勤明け = 2日分の勤務としてカウント
      workDayCount.set(selected.id, (workDayCount.get(selected.id) || 0) + 2);
      console.log(`  ${date} 夜勤: 職員${selected.id}(${selected.name}) ※夜勤入り+明け=2日分`);

      // ルール適用: 夜勤入り→夜勤明け→休み

      // 1. 夜勤の翌日は「夜勤明け」（配置不可）
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      if (nextDay.getFullYear() === year && nextDay.getMonth() + 1 === month) {
        const key = `${selected.id}_${nextDayStr}`;
        const avail = availabilityMap.get(key);
        if (avail) {
          avail.canAssign = false;
          avail.reason = '夜勤明け（9時まで勤務、その後休み）';
          console.log(`    → ${nextDayStr} は夜勤明け（配置不可）`);
        }
      }

      // 2. 夜勤明けの翌日は「休み」（配置不可）
      const dayAfterNext = new Date(date);
      dayAfterNext.setDate(dayAfterNext.getDate() + 2);
      const dayAfterNextStr = dayAfterNext.toISOString().split('T')[0];

      if (dayAfterNext.getFullYear() === year && dayAfterNext.getMonth() + 1 === month) {
        const key = `${selected.id}_${dayAfterNextStr}`;
        const avail = availabilityMap.get(key);
        if (avail) {
          avail.canAssign = false;
          avail.reason = '夜勤明けの翌日（休み）';
          console.log(`    → ${dayAfterNextStr} は休み（明け番翌日）`);
        }
      }
    }
  }

  console.log(`\n夜勤配置完了: ${generatedShifts.length}件`);

  // ========================================
  // ステップ2: 正社員の日中必須配置（9-16時）
  // ========================================
  console.log('\n--- ステップ2: 正社員の9-16時配置 ---');

  // 正社員を取得
  const positionGroups = await db.getAllPositionGroups();
  const fullTimeEmployees = employees.filter(e => {
    const group = positionGroups.find(g => g.id === e.positionGroupId);
    return group?.employmentType === 'fulltime';
  });

  // 9-16時をカバーする時間枠を取得（夜勤以外）
  const daytimeSlots = workTimeSlots.filter(ts => {
    if (ts.isNightShift) return false;

    // 開始時刻と終了時刻をパース
    const [startHour] = ts.startTime.split(':').map(Number);
    const [endHour] = ts.endTime.split(':').map(Number);

    // 9時以前に開始し、16時以降に終了する時間枠
    return startHour <= 9 && endHour >= 16;
  });

  console.log(`9-16時をカバーする時間枠: ${daytimeSlots.length}件`);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 既にこの日に正社員が配置されているかチェック
    const hasFullTimeOnDate = generatedShifts.some(s => {
      if (s.date !== date) return false;
      const emp = fullTimeEmployees.find(e => e.id === s.employeeId);
      return emp !== undefined;
    });

    if (hasFullTimeOnDate) {
      console.log(`  ${date}: 既に正社員配置済み（スキップ）`);
      continue;
    }

    // 配置可能な正社員を探す
    const candidates = fullTimeEmployees.filter(emp => {
      const key = `${emp.id}_${date}`;
      const availability = availabilityMap.get(key);

      if (!availability || !availability.canAssign) return false;
      if (confirmedShifts.some(s => s.employeeId === emp.id && s.date === date)) return false;
      if (generatedShifts.some(s => s.employeeId === emp.id && s.date === date)) return false;

      return true;
    });

    if (candidates.length === 0) {
      console.warn(`⚠️ ${date} の正社員配置不可: 候補者なし`);
      continue;
    }

    // 最も勤務日数が少ない正社員を選択
    candidates.sort((a, b) => {
      const countA = workDayCount.get(a.id) || 0;
      const countB = workDayCount.get(b.id) || 0;
      return countA - countB;
    });

    const selected = candidates[0];

    // 適切な時間枠を選択（最初に見つかったもの）
    const timeSlot = daytimeSlots[0];

    if (!timeSlot) {
      console.warn(`⚠️ ${date} の正社員配置不可: 時間枠なし`);
      continue;
    }

    // 正社員を配置
    generatedShifts.push({
      shiftId,
      employeeId: selected.id,
      date,
      status: 'working',
      timeSlotId: timeSlot.id,
      startTime: null,
      endTime: null,
      leaveType: null,
      generatedBy: 'rule_based',
      reason: `正社員必須配置（9-16時カバー: ${timeSlot.name}）`,
    });

    workDayCount.set(selected.id, (workDayCount.get(selected.id) || 0) + 1);
    console.log(`  ${date} 正社員配置: 職員${selected.id}(${selected.name}) - ${timeSlot.name}`);
  }

  console.log(`\n正社員配置完了: ${generatedShifts.length}件`);

  // ========================================
  // ステップ3: その他の時間帯の配置（必要人数に基づく）
  // ========================================
  console.log('\n--- ステップ3: その他の時間帯配置 ---');

  // 各日・各時間枠で必要人数を満たすように配置
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // この日の必要人数を取得（曜日別）
    const dayRequirements = requiredStaffing.filter(rs => rs.dayOfWeek === dayOfWeek && rs.requiredCount > 0);

    // 各時間枠について配置を試みる
    for (const slot of workTimeSlots) {
      if (slot.isNightShift) continue; // 夜勤は既に配置済み

      // この時間枠の現在の配置数をカウント
      const currentAssignments = generatedShifts.filter(s =>
        s.date === date && s.timeSlotId === slot.id
      ).length;

      // 必要人数を計算（requiredStaffingテーブル優先）
      let required = slot.requiredStaff || 1;

      // requiredStaffingテーブルから曜日・時間別の必要人数を取得
      const [startHour] = slot.startTime.split(':').map(Number);
      const [endHour] = slot.endTime.split(':').map(Number);

      // この時間枠がカバーする時間帯の最大必要人数を取得
      let maxRequiredFromTable = 0;
      for (let hour = startHour; hour <= (endHour > startHour ? endHour : 23); hour++) {
        const hourRequirement = requiredStaffing.find(
          rs => rs.dayOfWeek === dayOfWeek && rs.hour === hour
        );
        if (hourRequirement && hourRequirement.requiredCount > maxRequiredFromTable) {
          maxRequiredFromTable = hourRequirement.requiredCount;
        }
      }

      // requiredStaffingテーブルの値がある場合はそちらを優先
      if (maxRequiredFromTable > 0) {
        required = maxRequiredFromTable;
      }

      // 既に必要人数を満たしている場合はスキップ
      if (currentAssignments >= required) continue;

      // 不足分を配置
      const shortage = required - currentAssignments;

      for (let i = 0; i < shortage; i++) {
        // 配置可能な職員を探す（パートを優先）
        const candidates = employees.filter(emp => {
          const key = `${emp.id}_${date}`;
          const availability = availabilityMap.get(key);

          if (!availability || !availability.canAssign) return false;
          if (confirmedShifts.some(s => s.employeeId === emp.id && s.date === date)) return false;
          if (generatedShifts.some(s => s.employeeId === emp.id && s.date === date)) return false;

          // 連続勤務制限チェック
          const allShifts: ShiftDay[] = [...confirmedShifts, ...generatedShifts].map(s => ({
            date: s.date,
            employeeId: s.employeeId,
            status: s.status as 'working' | 'off' | 'requested_off' | 'emergency_off',
          }));

          const consecutiveCheck = checkConsecutiveWorkLimit(emp.id, date, allShifts, 4);
          if (!consecutiveCheck.canAssign) return false;

          return true;
        });

        if (candidates.length === 0) break;

        // パートを優先的に選択（正社員の公休確保のため）
        candidates.sort((a, b) => {
          const groupA = positionGroups.find(g => g.id === a.positionGroupId);
          const groupB = positionGroups.find(g => g.id === b.positionGroupId);
          const isPartTimeA = groupA?.employmentType === 'parttime' ? 1 : 0;
          const isPartTimeB = groupB?.employmentType === 'parttime' ? 1 : 0;

          // パート優先（降順）
          if (isPartTimeB !== isPartTimeA) return isPartTimeB - isPartTimeA;

          // 勤務日数が少ない順
          const countA = workDayCount.get(a.id) || 0;
          const countB = workDayCount.get(b.id) || 0;
          return countA - countB;
        });

        const selected = candidates[0];

        // 配置
        generatedShifts.push({
          shiftId,
          employeeId: selected.id,
          date,
          status: 'working',
          timeSlotId: slot.id,
          startTime: null,
          endTime: null,
          leaveType: null,
          generatedBy: 'rule_based',
          reason: `必要人数配置（${slot.name}）`,
        });

        workDayCount.set(selected.id, (workDayCount.get(selected.id) || 0) + 1);
        console.log(`  ${date} ${slot.name}: 職員${selected.id}(${selected.name})`);
      }
    }
  }

  console.log(`\nその他時間帯配置完了: ${generatedShifts.length}件`);

  // ========================================
  // ステップ4: 公休日数チェック（正社員）
  // ========================================
  console.log('\n--- ステップ4: 公休日数チェック ---');

  for (const emp of fullTimeEmployees) {
    const workDays = workDayCount.get(emp.id) || 0;
    const publicHolidays = daysInMonth - workDays;
    const requiredHolidays = month === 2 ? 8 : 9;

    if (publicHolidays < requiredHolidays) {
      console.warn(`⚠️ 職員${emp.id}(${emp.name}): 公休${publicHolidays}日（必要${requiredHolidays}日）- 不足${requiredHolidays - publicHolidays}日`);
    } else {
      console.log(`  職員${emp.id}(${emp.name}): 公休${publicHolidays}日（必要${requiredHolidays}日）- OK`);
    }
  }

  console.log(`\nPhase 3完了: ${generatedShifts.length}件のシフトを生成`);

  return generatedShifts;
}

/**
 * AIプロンプト構築
 */
function buildAIPrompt(
  year: number,
  month: number,
  employees: any[],
  workTimeSlots: any[],
  requiredStaffing: any[],
  confirmedShifts: any[],
  availableAssignments: any[]
): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  // 夜勤可能な職員をリストアップ
  const nightShiftCapable = employees.filter(e => e.canWorkNightShift);

  // 夜勤の時間枠を特定
  const nightShiftSlots = workTimeSlots.filter(ts => ts.isNightShift);

  // 必要人数の情報を整理（曜日・時間帯別）
  const staffingByDay = new Map<number, any[]>();
  for (const rs of requiredStaffing) {
    if (!staffingByDay.has(rs.dayOfWeek)) {
      staffingByDay.set(rs.dayOfWeek, []);
    }
    if (rs.requiredCount > 0) {
      staffingByDay.get(rs.dayOfWeek)!.push(rs);
    }
  }

  return `
あなたは介護施設のシフト管理の専門家です。
以下の情報をもとに、**${year}年${month}月の全${daysInMonth}日間**のシフトを生成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 基本情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**対象期間**: ${year}年${month}月（**全${daysInMonth}日間、必ず全日をカバーすること**）
**職員数**: ${employees.length}名
**夜勤可能職員**: ${nightShiftCapable.length}名

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 👥 夜勤可能な職員（重要）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${nightShiftCapable.map((e: any) => `- 職員ID: ${e.id} - ${e.name} (スキルレベル: ${e.skillLevel})`).join("\n")}

**注意**: 夜勤シフトは、上記の職員のみに割り当て可能です。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⏰ 勤務時間枠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${workTimeSlots.map((ts: any) => {
  const nightMark = ts.isNightShift ? ' 🌙 **夜勤**' : '';
  return `- **${ts.name}** (ID: ${ts.id}): ${ts.startTime}〜${ts.endTime}${nightMark}`;
}).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📊 必要人数（曜日・時間帯別）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${Array.from(staffingByDay.entries()).sort((a, b) => a[0] - b[0]).map(([dow, reqs]) => {
  const nightReqs = reqs.filter((r: any) => {
    // 夜勤の時間帯（例: 16時〜翌9時）をカバーする時間帯
    return r.hour >= 16 || r.hour <= 9;
  });
  const nightCount = nightReqs.length > 0 ? nightReqs[0].requiredCount : 0;

  return `**${dayNames[dow]}曜日**: ${nightCount > 0 ? `🌙 夜勤 ${nightCount}名必須` : '夜勤なし'}`;
}).join("\n")}

**重要**:
- **夜勤は毎日必ず配置が必要**です（上記の必要人数を確保すること）
- 夜勤は夜勤可能職員のみに割り当て可能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ✅ 既に確定しているシフト
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${confirmedShifts.length}件のシフトが確定済み（休み申請、時間指定勤務希望）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📊 配置可能な職員・日付・時間
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${availableAssignments.slice(0, 100).map((a: any) => {
  const emp = employees.find(e => e.id === a.employeeId);
  const canNight = emp?.canWorkNightShift ? '🌙' : '';
  return `- ${a.date} 職員${a.employeeId}(${emp?.name})${canNight}: ${a.startTime}〜${a.endTime}`;
}).join("\n")}

${availableAssignments.length > 100 ? `... 他${availableAssignments.length - 100}件` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⚠️ 【最重要】絶対に守るべきルール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. 夜勤の必須配置
- **毎日必ず夜勤を配置すること**（${nightShiftSlots.map(ns => `ID:${ns.id}`).join(', ')}）
- 夜勤は夜勤可能職員（🌙マーク付き）のみに割り当て
- 必要人数を確保すること

### 2. 夜勤→明け番→休みのルール
- **夜勤の翌日は必ず休みにすること**
- 夜勤の翌々日から勤務可能
- 例: 1日に夜勤 → 2日は休み → 3日から勤務可能

### 3. 月全体のカバー
- **${year}年${month}月1日〜${daysInMonth}日まで、全ての日にシフトを生成すること**
- 特に夜勤は1日も欠かさず配置すること

### 4. 時間枠の選択
- 配置可能時間が既存の時間枠と完全一致する場合 → **timeSlotId** を使用
- カスタム時間の場合 → **timeSlotId=null, startTime, endTime** を使用

### 5. 公平性
- 夜勤可能職員間で夜勤回数を均等に分散（±2回以内）
- 職員間で勤務日数を公平に配分

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📝 出力形式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

各配置について、以下のいずれかの形式で出力してください:

**既存時間枠の場合:**
{
  "employeeId": 4,
  "date": "${year}-${String(month).padStart(2, '0')}-15",
  "timeSlotId": 7,
  "startTime": null,
  "endTime": null
}

**カスタム時間の場合:**
{
  "employeeId": 4,
  "date": "${year}-${String(month).padStart(2, '0')}-15",
  "timeSlotId": null,
  "startTime": "08:30",
  "endTime": "13:00"
}

**重要**: 全${daysInMonth}日分のシフトを生成し、特に夜勤は毎日必ず配置してください。
`;
}

/**
 * AI生成結果の検証とフィルタリング
 */
function validateAndFilterShifts(
  aiShifts: any[],
  availableAssignments: any[],
  confirmedShifts: any[],
  workTimeSlots?: any[]
): any[] {
  const validShifts: any[] = [];
  const nightShiftSlots = workTimeSlots?.filter(ts => ts.isNightShift) || [];
  const nightShiftIds = new Set(nightShiftSlots.map(ns => ns.id));

  // 夜勤シフトのマップを作成（職員ID → 夜勤日付のセット）
  const nightShiftDates = new Map<number, Set<string>>();

  for (const shift of aiShifts) {
    // 1. 既に確定しているシフトと重複チェック
    const isDuplicate = confirmedShifts.some(
      cs => cs.employeeId === shift.employeeId && cs.date === shift.date
    );

    if (isDuplicate) {
      console.warn(`⚠️ スキップ: 既に確定済み（職員${shift.employeeId}, ${shift.date}）`);
      continue;
    }

    // 2. 配置可能リストに含まれているかチェック
    const isAvailable = availableAssignments.some(
      aa => aa.employeeId === shift.employeeId && aa.date === shift.date
    );

    if (!isAvailable) {
      console.warn(`⚠️ スキップ: 配置不可（職員${shift.employeeId}, ${shift.date}）`);
      continue;
    }

    // 3. カスタム時間の妥当性チェック
    if (shift.timeSlotId === null) {
      if (!shift.startTime || !shift.endTime) {
        console.warn(`⚠️ スキップ: カスタム時間が不正（職員${shift.employeeId}, ${shift.date}）`);
        continue;
      }

      // 30分刻みチェック
      const startValid = /^\d{2}:(00|30)$/.test(shift.startTime);
      const endValid = /^\d{2}:(00|30)$/.test(shift.endTime);

      if (!startValid || !endValid) {
        console.warn(`⚠️ スキップ: 30分刻みでない（職員${shift.employeeId}, ${shift.date}, ${shift.startTime}-${shift.endTime}）`);
        continue;
      }

      // 配置可能時間内かチェック
      const assignment = availableAssignments.find(
        aa => aa.employeeId === shift.employeeId && aa.date === shift.date
      );

      if (assignment) {
        const shiftStart = timeToSlot(shift.startTime);
        const shiftEnd = timeToSlot(shift.endTime);
        const availStart = timeToSlot(assignment.startTime);
        const availEnd = timeToSlot(assignment.endTime);

        if (shiftStart < availStart || shiftEnd > availEnd) {
          console.warn(`⚠️ スキップ: 配置可能時間外（職員${shift.employeeId}, ${shift.date}, ${shift.startTime}-${shift.endTime}）`);
          continue;
        }
      }
    }

    // 4. 夜勤シフトの場合、記録する
    if (shift.timeSlotId !== null && nightShiftIds.has(shift.timeSlotId)) {
      if (!nightShiftDates.has(shift.employeeId)) {
        nightShiftDates.set(shift.employeeId, new Set());
      }
      nightShiftDates.get(shift.employeeId)!.add(shift.date);
    }

    // 検証OK
    validShifts.push(shift);
  }

  // 5. 夜勤の翌日チェック - 夜勤の翌日にシフトが入っている場合は警告
  const shiftsToRemove: any[] = [];
  for (const shift of validShifts) {
    const shiftDate = new Date(shift.date);
    const prevDay = new Date(shiftDate);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayStr = prevDay.toISOString().split('T')[0];

    // 前日に夜勤があったかチェック
    const employeeNightShifts = nightShiftDates.get(shift.employeeId);
    if (employeeNightShifts?.has(prevDayStr)) {
      console.warn(`⚠️ スキップ: 夜勤の翌日（職員${shift.employeeId}, ${shift.date}、前日${prevDayStr}に夜勤）`);
      shiftsToRemove.push(shift);
    }
  }

  // 夜勤翌日のシフトを削除
  const finalShifts = validShifts.filter(s => !shiftsToRemove.includes(s));

  console.log(`検証結果: ${aiShifts.length}件 → ${validShifts.length}件 → 夜勤翌日除外後 ${finalShifts.length}件`);

  return finalShifts;
}

// ヘルパー: 時間をコマ番号に変換
function timeToSlot(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 2 + (minute >= 30 ? 1 : 0);
}

/**
 * AI呼び出し（カスタム時間対応スキーマ）
 */
async function invokeAIWithCustomTimeSupport(prompt: string): Promise<any[]> {
  const { invokeLLM } = await import('./_core/llm');

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "あなたは介護施設のシフト管理の専門家です。職員の勤務可能時間と必要人数を考慮して、最適なシフトを生成してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "shift_schedule",
        strict: true,
        schema: {
          type: "object",
          properties: {
            shifts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employeeId: {
                    type: "number",
                    description: "職員ID"
                  },
                  date: {
                    type: "string",
                    description: "日付（YYYY-MM-DD形式）"
                  },
                  timeSlotId: {
                    type: ["number", "null"],
                    description: "既存の時間枠ID。カスタム時間の場合はnull"
                  },
                  startTime: {
                    type: ["string", "null"],
                    description: "カスタム開始時刻（HH:MM形式、30分刻み）。timeSlotIdがnullの場合に使用"
                  },
                  endTime: {
                    type: ["string", "null"],
                    description: "カスタム終了時刻（HH:MM形式、30分刻み）。timeSlotIdがnullの場合に使用"
                  },
                },
                required: ["employeeId", "date", "timeSlotId", "startTime", "endTime"],
                additionalProperties: false,
              },
            },
          },
          required: ["shifts"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentStr || "{}");

  // 生成されたシフトを変換
  const shifts = (result.shifts || []).map((s: any) => ({
    employeeId: s.employeeId,
    date: s.date,
    status: 'working',
    timeSlotId: s.timeSlotId,
    startTime: s.startTime,
    endTime: s.endTime,
    leaveType: null,
    generatedBy: 'ai',
  }));

  console.log(`AI生成: ${shifts.length}件のシフト`);
  return shifts;
}

/**
 * 統合実行関数
 */
export async function generateShiftWithPhases(
  shiftId: number,
  year: number,
  month: number
): Promise<{
  confirmedShifts: any[];
  availabilityMap: Map<string, any>;
  ruleBasedShifts: any[];
  allShifts: any[];
}> {
  console.log(`\n🚀 段階的シフト生成開始: ${year}年${month}月`);

  // Phase 1: ハード制約確定
  const confirmedShifts = await phase1_confirmHardConstraints(shiftId, year, month);

  // Phase 2: 勤務可能枠計算
  const availabilityMap = await phase2_calculateAvailability(shiftId, year, month, confirmedShifts);

  // Phase 3: ルールベース配置
  const ruleBasedShifts = await phase3_ruleBasedAssignment(shiftId, year, month, confirmedShifts, availabilityMap);

  // 統合
  const allShifts = [...confirmedShifts, ...ruleBasedShifts];

  console.log(`\n✅ シフト生成完了: 合計${allShifts.length}件`);

  return {
    confirmedShifts,
    availabilityMap,
    ruleBasedShifts,
    allShifts,
  };
}

// ヘルパー関数
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const targetDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return targetDate >= start && targetDate <= end;
}
