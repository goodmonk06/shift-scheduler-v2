/**
 * ルールベースシフト生成 API統合モジュール
 *
 * ruleBasedShiftGenerator.tsのコア機能をAPI経由で利用するためのラッパー
 */

import { generateShiftRuleBased as generateShiftCore } from './ruleBasedShiftGenerator';
import { calculateAllAvailableSlots } from './availableSlotsCalculator';
import { validateAgainstAvailableSlots } from './shiftValidator';
import * as db from './db';
import type { EmployeeConstraints } from '../shared/employeeConstraintTypes';
import { eq } from 'drizzle-orm';

interface GenerateShiftParams {
  shiftId: number;
  year: number;
  month: number;
}

/**
 * ルールベースシフト生成のメイン関数
 * - データ収集
 * - 配置可能枠計算
 * - ルールベース生成
 * - バリデーション
 * - DB保存
 */
export async function generateShiftRuleBased(params: GenerateShiftParams): Promise<void> {
  const { shiftId, year, month } = params;

  try {
    console.log('[ルールベースシフト生成] 開始:', { shiftId, year, month });

    // ━━━ フェーズ1: データ収集 ━━━
    console.log('[ルールベースシフト生成] フェーズ1: データ収集');
    const context = await collectContext(shiftId, year, month);

    // ━━━ フェーズ2: 配置可能枠の計算 ━━━
    console.log('[ルールベースシフト生成] フェーズ2: 配置可能枠計算');
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const availableSlots = await calculateAllAvailableSlots(startDate, endDate);

    // 統計情報
    let totalPossibleSlots = 0;
    for (const employeeId in availableSlots) {
      for (const date in availableSlots[employeeId]) {
        totalPossibleSlots += availableSlots[employeeId][date].length;
      }
    }
    console.log(`[ルールベースシフト生成] 配置可能枠: ${totalPossibleSlots}枠`);

    // ━━━ フェーズ3: ルールベース生成 ━━━
    console.log('[ルールベースシフト生成] フェーズ3: ルールベース生成実行');
    const generationResult = generateShiftCore({
      period: { startDate, endDate },
      employees: context.employees,
      workTimeSlots: context.workTimeSlots,
      availableSlots,
      workplaceRules: context.workplaceRules,
    });

    console.log('[ルールベースシフト生成] 生成完了:', {
      assignments: generationResult.assignments.length,
      fulfillmentRate: generationResult.fulfillmentRate,
    });

    // ━━━ フェーズ4: バリデーション ━━━
    console.log('[ルールベースシフト生成] フェーズ4: バリデーション');
    const validationResult = validateAgainstAvailableSlots(
      generationResult.assignments,
      availableSlots,
      context.workTimeSlots
    );

    if (!validationResult.valid) {
      console.error('[ルールベースシフト生成] バリデーション失敗:', validationResult.errors.length, '件');
      throw new Error(
        `バリデーションエラー: ${validationResult.errors.length}件\n` +
        validationResult.errors.slice(0, 3).join('\n')
      );
    }

    if (validationResult.warnings.length > 0) {
      console.warn('[ルールベースシフト生成] 警告:', validationResult.warnings.length, '件');
    }

    // ━━━ フェーズ5: DB保存 ━━━
    console.log('[ルールベースシフト生成] フェーズ5: DB保存');
    await saveGeneratedShifts(shiftId, generationResult.assignments);

    console.log('[ルールベースシフト生成] 成功完了');
  } catch (error: any) {
    console.error('[ルールベースシフト生成] エラー:', error);
    throw new Error(`ルールベースシフト生成に失敗しました: ${error.message}`);
  }
}

/**
 * コンテキスト情報を収集
 */
async function collectContext(shiftId: number, year: number, month: number) {
  const database = await db.getDb();
  if (!database) {
    throw new Error('Database connection not available');
  }

  // 職員情報とポジショングループを取得
  const employeesData = await db.getAllEmployees();
  const positionGroups = await db.getAllPositionGroups();

  // 職員情報を整形
  const employees = employeesData.map((e) => {
    const group = positionGroups.find(g => g.id === e.positionGroupId);
    const constraints = e.additionalConstraints as EmployeeConstraints | null;

    return {
      id: e.id,
      name: e.name,
      skillLevel: e.skillLevel,
      canWorkNightShift: e.canWorkNightShift,
      minDaysOffPerMonth: group?.minDaysOffPerMonth ?? 8,
      personalInfo: constraints?.personalInfo
        ? {
            situation: constraints.personalInfo.situation,
            childrenAges: constraints.personalInfo.childrenAges,
            specialNotes: constraints.personalInfo.specialNotes,
          }
        : undefined,
      leaveBalance: {
        paidLeave: {
          remaining: constraints?.leaveAllowances?.paidLeave?.remainingDays ?? 20,
        },
        birthdayLeave:
          constraints?.leaveAllowances?.birthdayLeave?.eligible
            ? {
                remaining: constraints.leaveAllowances.birthdayLeave.remainingDays,
                validMonth: constraints.leaveAllowances.birthdayLeave.birthday?.substring(0, 2) ?? '',
              }
            : undefined,
        seasonalLeave: {
          summer: {
            remaining: constraints?.leaveAllowances?.seasonalLeave?.summer?.remainingDays ?? 3,
            validPeriod: constraints?.leaveAllowances?.seasonalLeave?.summer?.validPeriod ?? '6-9月',
          },
          winter: {
            remaining: constraints?.leaveAllowances?.seasonalLeave?.winter?.remainingDays ?? 5,
            validPeriod: constraints?.leaveAllowances?.seasonalLeave?.winter?.validPeriod ?? '12-1月',
          },
        },
      },
    };
  });

  // 勤務時間枠を取得
  const workTimeSlotsData = await db.getAllWorkTimeSlots();
  const workTimeSlots = workTimeSlotsData.map((s) => ({
    id: s.id,
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    isNightShift: s.isNightShift,
    requiredStaff: s.requiredStaff,
  }));

  // 職場ルールを取得
  const rulesData = await db.getAllWorkplaceRules();
  const minRestDaysRule = rulesData.find((r) => r.ruleType === 'min_rest_days');
  const nightShiftQuotaRule = rulesData.find((r) => r.ruleType === 'night_shift_quota');
  const postNightShiftRestRule = rulesData.find((r) => r.ruleType === 'post_night_shift_rest');
  const fulltimeRequiredHoursRule = rulesData.find((r) => r.ruleType === 'fulltime_required_hours');
  const maxConsecutiveDaysRule = rulesData.find((r) => r.ruleType === 'max_consecutive_days');

  const workplaceRules = {
    minRestDaysPerMonth: (minRestDaysRule?.ruleValue as any)?.days ?? 8,
    nightShiftQuota: (nightShiftQuotaRule?.ruleValue as any)?.quota,
    postNightShiftRest: (postNightShiftRestRule?.ruleValue as any)?.required ?? true,
    fulltimeRequiredHours: (fulltimeRequiredHoursRule?.ruleValue as any)?.hoursPerWeek ?? 40,
    maxConsecutiveDays: (maxConsecutiveDaysRule?.ruleValue as any)?.days ?? 4,
  };

  console.log('[ルールベースシフト生成] コンテキスト収集完了:', {
    employees: employees.length,
    workTimeSlots: workTimeSlots.length,
    workplaceRules: Object.keys(workplaceRules).length,
  });

  return {
    employees,
    workTimeSlots,
    workplaceRules,
  };
}

/**
 * 生成されたシフトをDBに保存
 */
async function saveGeneratedShifts(
  shiftId: number,
  assignments: Array<{ employeeId: number; date: string; timeSlotId: number }>
): Promise<void> {
  try {
    const database = await db.getDb();
    if (!database) {
      throw new Error('Database connection not available');
    }

    await database.transaction(async (tx) => {
      console.log('[ルールベースシフト生成] トランザクション開始');

      // ステップ1: ルールベース生成のシフト詳細のみを削除
      await db.deleteRuleBasedGeneratedShiftDetailsWithTransaction(tx, shiftId);
      console.log('[ルールベースシフト生成] 既存ルールベースシフト削除完了');

      // ステップ2: 新しいシフトをDBに保存
      for (const assignment of assignments) {
        await db.createShiftDetailWithTransaction(tx, {
          employeeId: assignment.employeeId,
          date: assignment.date,
          timeSlotId: assignment.timeSlotId,
          shiftId,
          status: 'working' as const,
          generatedBy: 'rule_based' as const,
        });
      }
      console.log('[ルールベースシフト生成] シフトDB保存完了:', assignments.length, '件');

      // ステップ3: シフトのステータスを更新
      await db.updateShiftWithTransaction(tx, shiftId, {
        generatedBy: 'rule_based',
        status: 'draft',  // ルールベース生成後はdraftに遷移
      });
      console.log('[ルールベースシフト生成] シフト情報更新完了');

      console.log('[ルールベースシフト生成] トランザクションコミット準備完了');
    });

    console.log('[ルールベースシフト生成] 完了（すべての操作が成功しました）');
  } catch (error: any) {
    console.error('[ルールベースシフト生成] エラー（トランザクションがロールバックされました）:', error);
    throw error;
  }
}
