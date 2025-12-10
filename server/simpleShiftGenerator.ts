/**
 * シンプルシフト生成器（12月ロジック踏襲版）
 *
 * Phase 1: ハード制約確定（希望休・希望シフト）
 * Phase 2: 基本配置（夜勤・日勤） ※今後実装
 * Phase 3: 統計計算 ※今後実装
 *
 * 参照: docs/IMPLEMENTATION_PLAN_2026.md - セクション7.2
 */

import * as db from './db';
import type { InsertShiftDetail } from '../drizzle/schema';

/**
 * ヘルパー関数: 日付が範囲内にあるかチェック
 */
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Phase 1: ハード制約確定
 * 承認済みの希望休・希望シフトをシフトに配置し、ロック（isFixed=true）
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
): Promise<InsertShiftDetail[]> {
  console.log('\n=== Phase 1: ハード制約確定 ===');
  console.log(`シフトID: ${shiftId}, 対象: ${year}年${month}月`);

  const confirmedShifts: InsertShiftDetail[] = [];

  // データ取得
  const employees = await db.getAllEmployees();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const workPreferences = await db.getWorkPreferencesByShift(shiftId);

  console.log(`職員数: ${employees.length}, 希望休: ${leaveRequests.length}, 希望シフト: ${workPreferences.length}`);

  const daysInMonth = new Date(year, month, 0).getDate();

  // 各日付・各職員について処理
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const employee of employees) {
      // 希望休チェック（承認済みのみ）
      const leave = leaveRequests.find(lr =>
        lr.employeeId === employee.id &&
        lr.status === 'approved' &&
        isDateInRange(date, lr.startDate, lr.endDate)
      );

      if (leave) {
        // 希望休を確定・ロック
        // 夏季・冬季休暇は「休」として扱う（shiftDetailsのleaveTypeは「休」「有休」のみ）
        const mappedLeaveType: '休' | '有休' =
          leave.leaveType === '有休' ? '有休' : '休';

        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'requested_off',
          timeSlotId: null,
          leaveType: mappedLeaveType,
          startTime: null,
          endTime: null,
          displayText: leave.leaveType, // 表示テキストは元の値を保持
          generatedBy: 'leave_request',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: true,  // ★ロック
          sourceType: 'leave_request',
          sourceId: leave.id,
        });

        console.log(`  ${date} ${employee.name}: ${leave.leaveType}（ロック）`);
        continue;
      }

      // 希望シフトチェック（承認済みのみ）
      const workPref = workPreferences.find(wp =>
        wp.employeeId === employee.id &&
        wp.status === 'approved' &&
        isDateInRange(date, wp.startDate, wp.endDate)
      );

      if (workPref) {
        // 希望シフトを確定・ロック
        const startHour = workPref.startTime.substring(0, 2);
        const endHour = workPref.endTime.substring(0, 2);
        const displayText = `${startHour}～${endHour}`;

        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'working',
          timeSlotId: null,
          leaveType: null,
          startTime: workPref.startTime,
          endTime: workPref.endTime,
          displayText,
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: true,  // ★ロック
          sourceType: 'work_preference',
          sourceId: workPref.id,
        });

        console.log(`  ${date} ${employee.name}: ${displayText}（ロック）`);
      }
    }
  }

  console.log(`\nPhase 1完了: ${confirmedShifts.length}件のハード制約を確定`);
  return confirmedShifts;
}

/**
 * 曜日名から曜日インデックスを取得
 */
const DAY_NAME_TO_INDEX: Record<string, number> = {
  "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6
};

/**
 * 日本の祝日リスト（2025年・2026年）
 * TODO: 将来的にはAPIまたはDBから取得
 */
const HOLIDAYS_2025_2026 = [
  // 2025年
  '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-02-24',
  '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23',
  '2025-10-13', '2025-11-03', '2025-11-23', '2025-11-24', '2025-12-23',
  // 2026年
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
  '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23',
  '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-23',
];

function isHoliday(date: string): boolean {
  return HOLIDAYS_2025_2026.includes(date);
}

/**
 * 大橋さん専用: 柔軟な夜勤サイクル
 * - 通常パターン: 夜→明→休（3日サイクル）も可能
 * - 連続パターン: 夜→明→夜→明→休（5日サイクル）も可能
 * - 制約: 金曜日は夜勤不可（通常勤務は可能）、早番不可、夜勤回数に制限なし
 *
 * @param shiftId シフトID
 * @param employeeId 職員ID
 * @param year 年
 * @param month 月
 * @param confirmedKeys 既に確定済みの日付キーのセット
 * @returns 夜勤サイクルのシフト詳細リスト
 */
function generateOhashiNightCombo(
  shiftId: number,
  employeeId: number,
  year: number,
  month: number,
  confirmedKeys: Set<string>
): InsertShiftDetail[] {
  const nightShifts: InsertShiftDetail[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  console.log(`    大橋夜勤配置: ${year}年${month}月（金曜夜勤不可、早番不可）`);

  let nightCount = 0;
  let currentDay = 1;

  // ヘルパー関数: 日付文字列を生成
  const toDateStr = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const toKey = (day: number) => `${toDateStr(day)}_${employeeId}`;

  // ヘルパー関数: 指定日が金曜日かチェック
  const isFriday = (day: number) => new Date(year, month - 1, day).getDay() === 5;

  // ヘルパー関数: 指定日が空いているかチェック
  const isAvailable = (day: number) => day <= daysInMonth && !confirmedKeys.has(toKey(day));

  // ヘルパー関数: 夜勤を追加
  const addNight = (day: number) => {
    nightShifts.push({
      shiftId, employeeId, date: toDateStr(day),
      status: 'working', timeSlotId: null, leaveType: null,
      startTime: '16:00', endTime: '09:00', displayText: '夜',
      generatedBy: 'rule_based', isChanged: false, previousTimeSlotId: null,
      isFixed: false, sourceType: 'special_rule', sourceId: null,
    });
    confirmedKeys.add(toKey(day));
  };

  // ヘルパー関数: 明を追加
  const addAke = (day: number) => {
    nightShifts.push({
      shiftId, employeeId, date: toDateStr(day),
      status: 'working', timeSlotId: null, leaveType: null,
      startTime: '09:00', endTime: '09:00', displayText: '明',
      generatedBy: 'rule_based', isChanged: false, previousTimeSlotId: null,
      isFixed: false, sourceType: 'special_rule', sourceId: null,
    });
    confirmedKeys.add(toKey(day));
  };

  // ヘルパー関数: 休を追加
  const addRest = (day: number) => {
    nightShifts.push({
      shiftId, employeeId, date: toDateStr(day),
      status: 'leave', timeSlotId: null, leaveType: '公休',
      startTime: null, endTime: null, displayText: '休',
      generatedBy: 'rule_based', isChanged: false, previousTimeSlotId: null,
      isFixed: false, sourceType: 'special_rule', sourceId: null,
    });
    confirmedKeys.add(toKey(day));
  };

  while (currentDay <= daysInMonth - 2) {
    // 金曜日は夜勤不可
    if (isFriday(currentDay)) {
      currentDay++;
      continue;
    }

    // 3日分（夜→明→休 or 夜→明→夜...）が空いているか確認
    if (!isAvailable(currentDay) || !isAvailable(currentDay + 1) || !isAvailable(currentDay + 2)) {
      currentDay++;
      continue;
    }

    // 5日サイクル（夜→明→夜→明→休）を試みる
    // 条件: 5日分空いている AND 3日目（2回目の夜勤）が金曜でない
    const canDo5Day = currentDay + 4 <= daysInMonth &&
      isAvailable(currentDay + 3) && isAvailable(currentDay + 4) &&
      !isFriday(currentDay + 2);

    if (canDo5Day) {
      // 5日サイクル
      addNight(currentDay);
      addAke(currentDay + 1);
      addNight(currentDay + 2);
      addAke(currentDay + 3);
      addRest(currentDay + 4);

      console.log(`      ${currentDay}日: 夜 → ${currentDay + 1}日: 明 → ${currentDay + 2}日: 夜 → ${currentDay + 3}日: 明 → ${currentDay + 4}日: 休`);
      nightCount += 2;
      currentDay += 5;
    } else {
      // 3日サイクル（夜→明→休）
      addNight(currentDay);
      addAke(currentDay + 1);
      addRest(currentDay + 2);

      console.log(`      ${currentDay}日: 夜 → ${currentDay + 1}日: 明 → ${currentDay + 2}日: 休`);
      nightCount += 1;
      currentDay += 3;
    }
  }

  console.log(`    配置完了: 夜勤${nightCount}回 (${nightShifts.length}件)`);

  return nightShifts;
}

/**
 * 杉山さん専用: 毎週金曜夜勤固定
 *
 * @param shiftId シフトID
 * @param employeeId 職員ID
 * @param year 年
 * @param month 月
 * @param confirmedKeys 既に確定済みの日付キーのセット
 * @returns 金曜夜勤のシフト詳細リスト
 */
function generateSugiyamaFriday(
  shiftId: number,
  employeeId: number,
  year: number,
  month: number,
  confirmedKeys: Set<string>
): InsertShiftDetail[] {
  const nightShifts: InsertShiftDetail[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  console.log(`    杉山金曜夜勤配置: ${year}年${month}月`);

  let nightCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    // 金曜日（5）かつ翌日・翌々日が月内
    if (dayOfWeek === 5 && day <= daysInMonth - 2) {
      const nightDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const akeDate = `${year}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
      const restDate = `${year}-${String(month).padStart(2, '0')}-${String(day + 2).padStart(2, '0')}`;

      const nightKey = `${nightDate}_${employeeId}`;
      const akeKey = `${akeDate}_${employeeId}`;
      const restKey = `${restDate}_${employeeId}`;

      // 3日とも空いているか確認
      if (!confirmedKeys.has(nightKey) && !confirmedKeys.has(akeKey) && !confirmedKeys.has(restKey)) {
        // 金曜：夜勤
        nightShifts.push({
          shiftId,
          employeeId,
          date: nightDate,
          status: 'working',
          timeSlotId: null,
          leaveType: null,
          startTime: '16:00',
          endTime: '09:00',
          displayText: '夜',
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'special_rule',
          sourceId: null,
        });

        // 土曜：明け
        nightShifts.push({
          shiftId,
          employeeId,
          date: akeDate,
          status: 'post_night_shift',
          timeSlotId: null,
          leaveType: null,
          startTime: null,
          endTime: null,
          displayText: '明',
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'special_rule',
          sourceId: null,
        });

        // 日曜：休み
        nightShifts.push({
          shiftId,
          employeeId,
          date: restDate,
          status: 'requested_off',
          timeSlotId: null,
          leaveType: '休',
          startTime: null,
          endTime: null,
          displayText: '休',
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'special_rule',
          sourceId: null,
        });

        // 確定済みに追加
        confirmedKeys.add(nightKey);
        confirmedKeys.add(akeKey);
        confirmedKeys.add(restKey);

        console.log(`      金${day}日: 夜 → 土${day + 1}日: 明 → 日${day + 2}日: 休`);
        nightCount++;
      }
    }
  }

  console.log(`    配置完了: ${nightCount}回の金曜夜勤 (${nightShifts.length}件)`);

  return nightShifts;
}

/**
 * 夜勤サイクルを生成
 * 夜勤→明け→休み の3日サイクルをnightShiftTarget回配置
 *
 * @param shiftId シフトID
 * @param employeeId 職員ID
 * @param year 年
 * @param month 月
 * @param nightShiftTarget 月間夜勤回数
 * @param confirmedKeys 既に確定済みの日付キーのセット
 * @returns 夜勤サイクルのシフト詳細リスト
 */
function generateNightShiftCycle(
  shiftId: number,
  employeeId: number,
  year: number,
  month: number,
  nightShiftTarget: number,
  confirmedKeys: Set<string>
): InsertShiftDetail[] {
  const nightShifts: InsertShiftDetail[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  // 月の日数に基づいて夜勤を均等に分散
  // 3日サイクル（夜勤+明け+休み）なので、使用する日数は nightShiftTarget * 3
  const totalNightDays = nightShiftTarget * 3;

  // 夜勤開始日を計算（月初から均等に配置）
  const interval = Math.floor(daysInMonth / nightShiftTarget);

  console.log(`    夜勤配置: 月${nightShiftTarget}回, 間隔=${interval}日`);

  let nightCount = 0;
  let currentDay = 1;

  while (nightCount < nightShiftTarget && currentDay <= daysInMonth - 2) {
    // 3日分のキーを確認（夜勤、明け、休み）
    const nightDate = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    const akeDate = `${year}-${String(month).padStart(2, '0')}-${String(currentDay + 1).padStart(2, '0')}`;
    const restDate = `${year}-${String(month).padStart(2, '0')}-${String(currentDay + 2).padStart(2, '0')}`;

    const nightKey = `${nightDate}_${employeeId}`;
    const akeKey = `${akeDate}_${employeeId}`;
    const restKey = `${restDate}_${employeeId}`;

    // 3日とも空いているか確認
    if (!confirmedKeys.has(nightKey) && !confirmedKeys.has(akeKey) && !confirmedKeys.has(restKey)) {
      // 夜勤
      nightShifts.push({
        shiftId,
        employeeId,
        date: nightDate,
        status: 'working',
        timeSlotId: null,
        leaveType: null,
        startTime: '16:00',
        endTime: '09:00',  // 翌日
        displayText: '夜',
        generatedBy: 'rule_based',
        isChanged: false,
        previousTimeSlotId: null,
        isFixed: false,
        sourceType: 'night_shift_cycle',
        sourceId: null,
      });

      // 明け
      nightShifts.push({
        shiftId,
        employeeId,
        date: akeDate,
        status: 'post_night_shift',
        timeSlotId: null,
        leaveType: null,
        startTime: null,
        endTime: null,
        displayText: '明',
        generatedBy: 'rule_based',
        isChanged: false,
        previousTimeSlotId: null,
        isFixed: false,
        sourceType: 'night_shift_cycle',
        sourceId: null,
      });

      // 休み
      nightShifts.push({
        shiftId,
        employeeId,
        date: restDate,
        status: 'requested_off',
        timeSlotId: null,
        leaveType: '休',
        startTime: null,
        endTime: null,
        displayText: '休',
        generatedBy: 'rule_based',
        isChanged: false,
        previousTimeSlotId: null,
        isFixed: false,
        sourceType: 'night_shift_cycle',
        sourceId: null,
      });

      // 確定済みに追加
      confirmedKeys.add(nightKey);
      confirmedKeys.add(akeKey);
      confirmedKeys.add(restKey);

      console.log(`      ${currentDay}日: 夜 → ${currentDay + 1}日: 明 → ${currentDay + 2}日: 休`);

      nightCount++;
      currentDay += interval;  // 次の夜勤開始日へ
    } else {
      // 空いていない場合は翌日を試す
      currentDay++;
    }
  }

  console.log(`    配置完了: ${nightCount}回の夜勤サイクル (${nightShifts.length}件)`);

  return nightShifts;
}

/**
 * Phase 2: 基本配置
 * 固定制約（offDays, fixedDays, holidayOff）を反映し、
 * 夜勤サイクルを配置し、残りの枠にデフォルトシフトを配置
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param confirmedShifts Phase 1で確定したシフト
 * @returns 基本配置されたシフト詳細リスト
 */
export async function phase2_basicPlacement(
  shiftId: number,
  year: number,
  month: number,
  confirmedShifts: InsertShiftDetail[]
): Promise<InsertShiftDetail[]> {
  console.log('\n=== Phase 2: 基本配置 ===');

  const placedShifts: InsertShiftDetail[] = [];
  const employees = await db.getAllEmployees();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Phase 1で確定済みの日付・職員を追跡
  const confirmedKeys = new Set(
    confirmedShifts.map(s => `${s.date}_${s.employeeId}`)
  );

  console.log(`  職員数: ${employees.length}, 対象日数: ${daysInMonth}日`);
  console.log(`  Phase1確定済み: ${confirmedShifts.length}件`);

  let offDayCount = 0;
  let fixedDayCount = 0;
  let holidayCount = 0;
  let defaultShiftCount = 0;
  let nightShiftCount = 0;

  // === 特殊ルール・夜勤サイクル配置（最優先） ===
  console.log('\n  --- 特殊ルール・夜勤サイクル配置 ---');
  let specialRuleCount = 0;

  for (const employee of employees) {
    const constraints = (employee.additionalConstraints || {}) as any;
    const nightShiftTarget = constraints.nightShiftTarget as number | undefined;
    const specialRuleId = constraints.specialRuleId as string | undefined;

    // 1. OHASHI_NIGHT_COMBO: 連続夜勤サイクル（夜→明→夜→明→休、金曜夜勤不可、回数制限なし）
    if (specialRuleId === 'OHASHI_NIGHT_COMBO') {
      console.log(`  ${employee.name}: OHASHI_NIGHT_COMBO (連続夜勤サイクル、金曜夜勤不可)`);
      const nightShifts = generateOhashiNightCombo(
        shiftId,
        employee.id,
        year,
        month,
        confirmedKeys
      );
      placedShifts.push(...nightShifts);
      specialRuleCount += nightShifts.length;
      continue;  // 通常の夜勤サイクルはスキップ
    }

    // 2. SUGIYAMA_FRIDAY: 毎週金曜夜勤固定
    if (specialRuleId === 'SUGIYAMA_FRIDAY') {
      console.log(`  ${employee.name}: SUGIYAMA_FRIDAY (毎週金曜夜勤)`);
      const nightShifts = generateSugiyamaFriday(
        shiftId,
        employee.id,
        year,
        month,
        confirmedKeys
      );
      placedShifts.push(...nightShifts);
      specialRuleCount += nightShifts.length;
      continue;  // 通常の夜勤サイクルはスキップ
    }

    // 3. 通常の夜勤サイクル（specialRuleIdがない場合）
    if (nightShiftTarget && nightShiftTarget > 0) {
      console.log(`  ${employee.name}: 通常夜勤サイクル (夜勤${nightShiftTarget}回)`);
      const nightShifts = generateNightShiftCycle(
        shiftId,
        employee.id,
        year,
        month,
        nightShiftTarget,
        confirmedKeys
      );
      placedShifts.push(...nightShifts);
      nightShiftCount += nightShifts.length;
    }
  }

  // === 固定制約の配置 ===
  console.log('\n  --- 固定制約配置 ---');
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const dayName = Object.keys(DAY_NAME_TO_INDEX).find(
      k => DAY_NAME_TO_INDEX[k] === dayOfWeek
    ) || '';

    for (const employee of employees) {
      const key = `${date}_${employee.id}`;

      // Phase 1で確定済み、または夜勤サイクルで確定済みはスキップ
      if (confirmedKeys.has(key)) continue;

      // 職員の制約を取得
      const constraints = (employee.additionalConstraints || {}) as any;

      // 1. 祝日休みチェック
      if (constraints.holidayOff && isHoliday(date)) {
        placedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'holiday_off',
          timeSlotId: null,
          leaveType: '休',
          startTime: null,
          endTime: null,
          displayText: '休',
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'holiday_constraint',
          sourceId: null,
        });
        confirmedKeys.add(key);
        holidayCount++;
        continue;
      }

      // 2. 固定休曜日チェック
      const offDays = constraints.offDays as string[] | undefined;
      if (offDays && offDays.includes(dayName)) {
        placedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'requested_off',
          timeSlotId: null,
          leaveType: '休',
          startTime: null,
          endTime: null,
          displayText: '休',
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'off_day_constraint',
          sourceId: null,
        });
        confirmedKeys.add(key);
        offDayCount++;
        continue;
      }

      // 3. 固定勤務曜日チェック
      const fixedDays = constraints.fixedDays as Record<string, string> | undefined;
      if (fixedDays && fixedDays[dayName]) {
        const shiftTime = fixedDays[dayName]; // 例: "9～16"
        placedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'working',
          timeSlotId: null,
          leaveType: null,
          startTime: null,
          endTime: null,
          displayText: shiftTime,
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'fixed_day_constraint',
          sourceId: null,
        });
        confirmedKeys.add(key);
        fixedDayCount++;
        continue;
      }

      // 4. デフォルトシフトがあれば配置（fixedTimeOnlyの場合のみ）
      const defaultShift = constraints.defaultShift as string | undefined;
      if (defaultShift && constraints.fixedTimeOnly) {
        placedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'working',
          timeSlotId: null,
          leaveType: null,
          startTime: null,
          endTime: null,
          displayText: defaultShift,
          generatedBy: 'rule_based',
          isChanged: false,
          previousTimeSlotId: null,
          isFixed: false,
          sourceType: 'default_shift',
          sourceId: null,
        });
        confirmedKeys.add(key);
        defaultShiftCount++;
        continue;
      }

      // 5. その他の職員はAI生成フェーズで処理するため、ここでは配置しない
    }
  }

  console.log(`\n  配置結果:`);
  console.log(`    - 特殊ルール: ${specialRuleCount}件 (大橋コンボ, 杉山金曜)`);
  console.log(`    - 夜勤サイクル: ${nightShiftCount}件`);
  console.log(`    - 祝日休み: ${holidayCount}件`);
  console.log(`    - 固定休曜日: ${offDayCount}件`);
  console.log(`    - 固定勤務曜日: ${fixedDayCount}件`);
  console.log(`    - デフォルトシフト: ${defaultShiftCount}件`);
  console.log(`    - 合計: ${placedShifts.length}件`);

  return placedShifts;
}

/**
 * 時間文字列からワーキングアワーを計算
 * 例: "9～17" -> 8, "8～16半" -> 8.5, "夜" -> 17 (16:00-9:00)
 */
function calculateWorkingHours(displayText: string | null, startTime: string | null, endTime: string | null): number {
  if (!displayText) return 0;

  // 夜勤は17時間（16:00-9:00）
  if (displayText === '夜') return 17;

  // 明けは0時間（勤務なし）
  if (displayText === '明') return 0;

  // 休みは0時間
  if (displayText === '休' || displayText === '有休') return 0;

  // startTime/endTimeがある場合はそれを使用
  if (startTime && endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24; // 翌日跨ぎ
    return hours;
  }

  // displayTextから計算（例: "9～17", "8～16半", "9半～13半"）
  const match = displayText.match(/(\d+)(半)?～(\d+)(半)?/);
  if (match) {
    const startHour = parseInt(match[1]) + (match[2] ? 0.5 : 0);
    const endHour = parseInt(match[3]) + (match[4] ? 0.5 : 0);
    return endHour - startHour;
  }

  return 0;
}

/**
 * 職員ごとの統計情報
 */
export interface EmployeeStats {
  employeeId: number;
  employeeName: string;
  workDays: number;      // 勤務日数
  workHours: number;     // 総労働時間
  nightShifts: number;   // 夜勤回数
  offDays: number;       // 休日数
  paidLeaveDays: number; // 有給休暇日数
  postNightDays: number; // 明け日数
}

/**
 * Phase 3: 統計計算
 * 全職員の勤務統計を計算
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param allShifts 全シフト詳細
 * @returns 職員ごとの統計情報
 */
export async function phase3_calculateStats(
  shiftId: number,
  year: number,
  month: number,
  allShifts: InsertShiftDetail[]
): Promise<EmployeeStats[]> {
  console.log('\n=== Phase 3: 統計計算 ===');

  const employees = await db.getAllEmployees();
  const statsMap = new Map<number, EmployeeStats>();

  // 職員ごとの統計を初期化
  for (const emp of employees) {
    statsMap.set(emp.id, {
      employeeId: emp.id,
      employeeName: emp.name,
      workDays: 0,
      workHours: 0,
      nightShifts: 0,
      offDays: 0,
      paidLeaveDays: 0,
      postNightDays: 0,
    });
  }

  // シフトから統計を集計
  for (const shift of allShifts) {
    const stats = statsMap.get(shift.employeeId);
    if (!stats) continue;

    const displayText = shift.displayText;

    // 夜勤
    if (displayText === '夜') {
      stats.nightShifts++;
      stats.workDays++;
      stats.workHours += calculateWorkingHours(displayText, shift.startTime, shift.endTime);
    }
    // 明け
    else if (displayText === '明') {
      stats.postNightDays++;
    }
    // 有給休暇
    else if (shift.leaveType === '有休' || displayText === '有休') {
      stats.paidLeaveDays++;
      stats.offDays++;
    }
    // 休み
    else if (shift.leaveType === '休' || displayText === '休' || shift.status === 'requested_off' || shift.status === 'holiday_off') {
      stats.offDays++;
    }
    // 勤務（上記以外）
    else if (shift.status === 'working' && displayText) {
      stats.workDays++;
      stats.workHours += calculateWorkingHours(displayText, shift.startTime, shift.endTime);
    }
  }

  // 結果をログ出力
  console.log('\n  職員別統計:');
  console.log('  ---------------------------------------------------------------');
  console.log('  名前              | 日数 | 時間   | 夜勤 | 休日 | 有給 | 明け');
  console.log('  ---------------------------------------------------------------');

  const stats = Array.from(statsMap.values());
  for (const s of stats) {
    const name = s.employeeName.padEnd(16);
    const days = s.workDays.toString().padStart(4);
    const hours = s.workHours.toFixed(1).padStart(6);
    const night = s.nightShifts.toString().padStart(4);
    const off = s.offDays.toString().padStart(4);
    const paid = s.paidLeaveDays.toString().padStart(4);
    const post = s.postNightDays.toString().padStart(4);
    console.log(`  ${name} | ${days} | ${hours} | ${night} | ${off} | ${paid} | ${post}`);
  }
  console.log('  ---------------------------------------------------------------');

  // サマリー
  const totalWorkDays = stats.reduce((sum, s) => sum + s.workDays, 0);
  const totalWorkHours = stats.reduce((sum, s) => sum + s.workHours, 0);
  const totalNightShifts = stats.reduce((sum, s) => sum + s.nightShifts, 0);
  console.log(`\n  サマリー: 総勤務日数=${totalWorkDays}, 総労働時間=${totalWorkHours.toFixed(1)}h, 夜勤回数=${totalNightShifts}`);

  return stats;
}

/**
 * 段階的配置を実行（Phase 1-3）
 *
 * @param shiftId シフトID
 * @returns 実行結果
 */
export async function executePhased(shiftId: number): Promise<{
  success: boolean;
  phase1Count: number;
  phase2Count: number;
  totalCount: number;
  stats: EmployeeStats[];
}> {
  console.log('\n========================================');
  console.log('段階的配置を開始');
  console.log('========================================');

  // シフト情報取得
  const shiftData = await db.getShiftById(shiftId);
  if (!shiftData) {
    throw new Error(`シフトID ${shiftId} が見つかりません`);
  }

  // getShiftByIdは { ...shift, shiftDetails } を返すが、TypeScript型推論が不完全
  // 型アサーションで明示的に year, month フィールドにアクセス
  const shift = shiftData as any;
  const year = shift.year as number;
  const month = shift.month as number;

  // Phase 1: ハード制約確定
  const phase1Shifts = await phase1_confirmHardConstraints(shiftId, year, month);

  // Phase 1のシフトをDBに保存
  for (const shiftDetail of phase1Shifts) {
    await db.createShiftDetail(shiftDetail);
  }

  // Phase 2: 基本配置
  const phase2Shifts = await phase2_basicPlacement(shiftId, year, month, phase1Shifts);

  // Phase 2のシフトをDBに保存
  for (const shiftDetail of phase2Shifts) {
    await db.createShiftDetail(shiftDetail);
  }

  // Phase 3: 統計計算
  const allShifts = [...phase1Shifts, ...phase2Shifts];
  const stats = await phase3_calculateStats(shiftId, year, month, allShifts);

  // シフトステータスを更新
  await db.updateShift(shiftId, {
    status: 'ai_generated',
    generatedBy: 'rule_based',
  });

  console.log('\n========================================');
  console.log('段階的配置が完了しました');
  console.log(`Phase 1: ${phase1Shifts.length}件`);
  console.log(`Phase 2: ${phase2Shifts.length}件`);
  console.log(`合計: ${allShifts.length}件`);
  console.log('========================================\n');

  return {
    success: true,
    phase1Count: phase1Shifts.length,
    phase2Count: phase2Shifts.length,
    totalCount: allShifts.length,
    stats,
  };
}

/**
 * シフトをリセット（希望休・希望シフトは保護）
 *
 * @param shiftId シフトID
 * @param options リセットオプション
 * @returns リセット結果
 */
export async function resetShift(
  shiftId: number,
  options: {
    keepApprovedRequests?: boolean;  // 承認済み希望休を保護（デフォルト: true）
    keepManualEdits?: boolean;       // 手動編集を保護（デフォルト: false）
  } = {}
): Promise<{
  success: boolean;
  deletedCount: number;
  keptCount: number;
}> {
  console.log('\n========================================');
  console.log('シフトリセットを開始');
  console.log('========================================');

  const keepApprovedRequests = options.keepApprovedRequests ?? true;
  const keepManualEdits = options.keepManualEdits ?? false;

  // 現在のシフト詳細を取得
  const shiftDetails = await db.getShiftDetailsByShiftId(shiftId);

  let deletedCount = 0;
  let keptCount = 0;

  for (const detail of shiftDetails) {
    // 希望休・希望シフト由来（isFixed=true）は保護
    if (keepApprovedRequests && detail.isFixed) {
      console.log(`  保護: ${detail.date} 職員ID ${detail.employeeId} (${detail.sourceType})`);
      keptCount++;
      continue;
    }

    // 手動編集（isChanged=true）を保護する場合
    if (keepManualEdits && detail.isChanged) {
      console.log(`  保護: ${detail.date} 職員ID ${detail.employeeId} (手動編集)`);
      keptCount++;
      continue;
    }

    // それ以外は削除
    await db.deleteShiftDetail(detail.id);
    deletedCount++;
  }

  console.log('\n========================================');
  console.log('シフトリセットが完了しました');
  console.log(`削除: ${deletedCount}件, 保護: ${keptCount}件`);
  console.log('========================================\n');

  return {
    success: true,
    deletedCount,
    keptCount,
  };
}
