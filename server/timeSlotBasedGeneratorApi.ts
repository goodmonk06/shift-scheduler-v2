/**
 * 時間スロットベースシフト生成 API統合モジュール
 */

import { generateTimeSlotBasedShift, convertToShiftDetails, type ExistingAssignment } from './timeSlotBasedGenerator';
import { calculateAllAvailableSlots } from './availableSlotsCalculator';
import { getDb } from './db';
import { employees, workTimeSlots, shiftDetails, positionGroups, workplaceRules } from '../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

interface GenerateTimeSlotShiftParams {
  shiftId: number;
  year: number;
  month: number;
}

/**
 * 時間スロットベースシフト生成のメイン関数
 */
export async function generateShiftTimeSlotBased(params: GenerateTimeSlotShiftParams): Promise<{
  success: boolean;
  assignmentsCreated: number;
  errors: string[];
}> {
  const { shiftId, year, month } = params;
  const db = await getDb();

  if (!db) {
    throw new Error('Database connection failed');
  }

  try {
    console.log('[時間スロットベースシフト生成] 開始:', { shiftId, year, month });

    // ━━━ フェーズ1: データ収集 ━━━
    console.log('[時間スロットベースシフト生成] フェーズ1: データ収集');

    // 職員データを取得
    const employeesData = await db.select().from(employees);

    // 勤務区分データを取得
    const positionGroupsData = await db.select().from(positionGroups);
    const positionGroupMap = new Map(positionGroupsData.map(pg => [pg.id, pg]));

    // 職員データに最低休日数を追加
    const employeesWithConstraints = employeesData.map(emp => ({
      ...emp,
      minDaysOff: positionGroupMap.get(emp.positionGroupId!)?.minDaysOffPerMonth || 0
    }));

    // 職場ルールを取得
    const rulesData = await db.select().from(workplaceRules);
    const workplaceRulesObj = {
      maxConsecutiveDays: 5
    };
    rulesData.forEach(rule => {
      if (rule.ruleName === 'maxConsecutiveDays') {
        workplaceRulesObj.maxConsecutiveDays = Number(rule.ruleValue);
      }
    });

    console.log(`[時間スロットベースシフト生成] 職員: ${employeesData.length}人`);

    // ━━━ フェーズ2: 配置可能枠の計算 ━━━
    console.log('[時間スロットベースシフト生成] フェーズ2: 配置可能枠計算');

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const availableSlots = await calculateAllAvailableSlots(startDate, endDate);

    // ━━━ フェーズ3: 既存のルールベース生成データを削除 ━━━
    console.log('[時間スロットベースシフト生成] フェーズ3: 既存データ削除');

    const deleteResult = await db.delete(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.generatedBy, 'rule_based')
        )
      );
    console.log(`  削除数: ${deleteResult.rowsAffected || 0}`);

    // ━━━ フェーズ3.5: 既存の休暇申請を取得 ━━━
    console.log('[時間スロットベースシフト生成] フェーズ3.5: 既存の休暇申請取得');

    const existingLeaveRequests = await db
      .select({
        date: shiftDetails.date,
        employeeId: shiftDetails.employeeId,
        status: shiftDetails.status,
        generatedBy: shiftDetails.generatedBy,
        timeSlotId: shiftDetails.timeSlotId
      })
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.generatedBy, 'leave_request')
        )
      );

    const existingAssignments: ExistingAssignment[] = existingLeaveRequests.map(req => ({
      date: req.date,
      employeeId: req.employeeId,
      shiftTypeId: req.timeSlotId || undefined,
      status: req.status as 'working' | 'off' | 'requested_off',
      isLocked: true,
      generatedBy: req.generatedBy || undefined
    }));

    console.log(`  既存の休暇申請: ${existingAssignments.length}件`);

    // ━━━ フェーズ4: 時間スロットベース生成 ━━━
    console.log('[時間スロットベースシフト生成] フェーズ4: シフト生成実行');

    const assignments = generateTimeSlotBasedShift(
      startDate,
      endDate,
      employeesWithConstraints,
      availableSlots,
      workplaceRulesObj,
      existingAssignments
    );

    console.log(`[時間スロットベースシフト生成] 生成完了: ${assignments.length}件`);

    // ━━━ フェーズ5: DB保存 ━━━
    console.log('[時間スロットベースシフト生成] フェーズ5: DB保存');

    const shiftDetailRecords = convertToShiftDetails(assignments, shiftId);

    if (shiftDetailRecords.length > 0) {
      // バッチで挿入（1000件ずつ）
      const batchSize = 1000;
      for (let i = 0; i < shiftDetailRecords.length; i += batchSize) {
        const batch = shiftDetailRecords.slice(i, i + batchSize);
        await db.insert(shiftDetails).values(batch);
        console.log(`  保存進捗: ${Math.min(i + batchSize, shiftDetailRecords.length)}/${shiftDetailRecords.length}`);
      }
    }

    console.log('[時間スロットベースシフト生成] 成功完了');

    return {
      success: true,
      assignmentsCreated: shiftDetailRecords.length,
      errors: []
    };

  } catch (error: any) {
    console.error('[時間スロットベースシフト生成] エラー:', error);
    return {
      success: false,
      assignmentsCreated: 0,
      errors: [error.message]
    };
  }
}

/**
 * 夜勤3日セット（夜→明→休）を追加
 * 時間スロットベースでも夜勤パターンを考慮
 */
export async function addNightShiftPattern(
  shiftId: number,
  employeeId: number,
  startDate: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const dayAfter = new Date(nextDate);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  // 夜勤3日セットを挿入
  const nightShiftRecords = [
    {
      shiftId,
      employeeDbId: employeeId,
      date: startDate,
      timeSlotId: 4,
      timeSlotName: '夜',
      generatedBy: 'rule_based',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      shiftId,
      employeeDbId: employeeId,
      date: nextDateStr,
      timeSlotId: 5,
      timeSlotName: '明',
      generatedBy: 'rule_based',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      shiftId,
      employeeDbId: employeeId,
      date: dayAfterStr,
      timeSlotId: null,
      timeSlotName: '休',
      generatedBy: 'rule_based',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.insert(shiftDetails).values(nightShiftRecords);
}