/**
 * 1週間分シフト生成テスト（ルールベース）
 *
 * calculateAllAvailableSlots → ルールベースシフト生成 → バリデーション
 * の全フローを統合テスト
 */

import { calculateAllAvailableSlots } from '../server/availableSlotsCalculator';
import { generateShiftRuleBased, printShiftStatistics } from '../server/ruleBasedShiftGenerator';
import { validateAgainstAvailableSlots } from '../server/shiftValidator';
import { getDb } from '../server/db';
import { employees, positionGroups, workTimeSlots, workplaceRules } from '../drizzle/schema';
import { eq, or } from 'drizzle-orm';
import type { EmployeeConstraints } from '../shared/employeeConstraintTypes';

async function testShiftGeneration1Week() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 1週間分シフト生成テスト（ルールベース）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト期間: 2025年11月1日〜11月7日（1週間）
  const startDate = '2025-11-01';
  const endDate = '2025-11-07';

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // ━━━ フェーズ1: データ準備 ━━━
  console.log('━━━ フェーズ1: データ準備 ━━━\n');

  const employeesData = await db
    .select({
      id: employees.id,
      name: employees.name,
      canWorkNightShift: employees.canWorkNightShift,
      skillLevel: employees.skillLevel,
      additionalConstraints: employees.additionalConstraints,
      positionGroupId: employees.positionGroupId,
      minDaysOffPerMonth: positionGroups.minDaysOffPerMonth,
      employmentType: positionGroups.employmentType,
    })
    .from(employees)
    .innerJoin(positionGroups, eq(employees.positionGroupId, positionGroups.id));

  const slotsData = await db
    .select()
    .from(workTimeSlots)
    .orderBy(workTimeSlots.startTime);

  // 職場ルールを取得
  const rulesData = await db
    .select()
    .from(workplaceRules)
    .where(eq(workplaceRules.isActive, true));

  console.log(`職員: ${employeesData.length}人`);
  console.log(`勤務時間枠: ${slotsData.length}枠`);
  console.log(`職場ルール: ${rulesData.length}件\n`);

  // ━━━ フェーズ2: 配置可能枠の事前計算 ━━━
  console.log('━━━ フェーズ2: 配置可能枠の事前計算 ━━━\n');

  const availableSlots = await calculateAllAvailableSlots(startDate, endDate);

  // 統計情報を表示
  let totalPossibleSlots = 0;
  for (const employeeId in availableSlots) {
    for (const date in availableSlots[employeeId]) {
      totalPossibleSlots += availableSlots[employeeId][date].length;
    }
  }
  console.log(`配置可能枠合計: ${totalPossibleSlots}枠\n`);

  // ━━━ フェーズ3: LLMへのプロンプト構築 ━━━
  console.log('━━━ フェーズ3: LLMへのプロンプト構築 ━━━\n');

  // 職員情報を整形
  const employeesInfo = employeesData.map((e) => {
    const constraints = e.additionalConstraints as EmployeeConstraints | null;

    return {
      id: e.id,
      name: e.name,
      skillLevel: e.skillLevel,
      canWorkNightShift: e.canWorkNightShift,
      minDaysOffPerMonth: e.minDaysOffPerMonth,
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

  // 勤務時間枠情報を整形
  const workTimeSlotsInfo = slotsData.map((s) => ({
    id: s.id,
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    isNightShift: s.isNightShift,
    requiredStaff: s.requiredStaff,
  }));

  // 職場ルール情報を整形
  const minRestDaysRule = rulesData.find((r) => r.ruleType === 'min_rest_days');
  const nightShiftQuotaRule = rulesData.find((r) => r.ruleType === 'night_shift_quota');
  const postNightShiftRestRule = rulesData.find((r) => r.ruleType === 'post_night_shift_rest');
  const fulltimeRequiredHoursRule = rulesData.find((r) => r.ruleType === 'fulltime_required_hours');
  const maxConsecutiveDaysRule = rulesData.find((r) => r.ruleType === 'max_consecutive_days');

  const workplaceRulesInfo = {
    minRestDaysPerMonth: (minRestDaysRule?.ruleValue as any)?.days ?? 8,
    nightShiftQuota: (nightShiftQuotaRule?.ruleValue as any)?.quota,
    postNightShiftRest: (postNightShiftRestRule?.ruleValue as any)?.required ?? true,
    fulltimeRequiredHours: (fulltimeRequiredHoursRule?.ruleValue as any)?.hoursPerWeek ?? 40,
    maxConsecutiveDays: (maxConsecutiveDaysRule?.ruleValue as any)?.days ?? 4,
  };

  console.log('プロンプトデータ準備完了\n');

  // ━━━ フェーズ4: ルールベースシフト生成 ━━━
  console.log('━━━ フェーズ4: ルールベースシフト生成 ━━━\n');

  const generationResult = generateShiftRuleBased({
    period: { startDate, endDate },
    employees: employeesInfo,
    workTimeSlots: workTimeSlotsInfo,
    availableSlots,
    workplaceRules: workplaceRulesInfo,
  });

  // 統計情報表示
  printShiftStatistics(generationResult);

  // ━━━ フェーズ5: バリデーション ━━━
  console.log('━━━ フェーズ5: バリデーション ━━━\n');

  const validationResult = validateAgainstAvailableSlots(
    generationResult.assignments,
    availableSlots,
    workTimeSlotsInfo
  );

  // バリデーション結果詳細
  if (!validationResult.valid) {
    console.log('❌ バリデーション失敗\n');
    console.log('━━━ エラー詳細 ━━━');
    validationResult.errors.forEach((error, idx) => {
      console.log(`${idx + 1}. ${error}`);
    });
    console.log('');
  } else {
    console.log('✅ バリデーション成功\n');
  }

  if (validationResult.warnings.length > 0) {
    console.log('━━━ 警告詳細 ━━━');
    validationResult.warnings.slice(0, 10).forEach((warning, idx) => {
      console.log(`${idx + 1}. ${warning}`);
    });
    if (validationResult.warnings.length > 10) {
      console.log(`   ... 他${validationResult.warnings.length - 10}件の警告\n`);
    }
    console.log('');
  }

  // ━━━ フェーズ6: シフト内容のサンプル表示 ━━━
  console.log('━━━ フェーズ6: シフト内容のサンプル表示 ━━━\n');

  // 2025-11-01のシフトを表示
  const day1Shifts = generationResult.assignments.filter((a) => a.date === '2025-11-01');
  console.log(`2025-11-01のシフト（${day1Shifts.length}件）:`);
  day1Shifts.forEach((shift) => {
    const employee = employeesData.find((e) => e.id === shift.employeeId);
    const timeSlot = slotsData.find((s) => s.id === shift.timeSlotId);
    console.log(`  - ${employee?.name} → ${timeSlot?.name} (${timeSlot?.startTime}-${timeSlot?.endTime})`);
  });
  console.log('');

  // ━━━ 最終結果 ━━━
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 1週間分シフト生成テスト完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 テスト結果サマリー:');
  console.log(`   期間: ${startDate} 〜 ${endDate}`);
  console.log(`   配置総数: ${generationResult.assignments.length}件`);
  console.log(`   バリデーション: ${validationResult.valid ? '✅ 合格' : '❌ 不合格'}`);
  console.log(`   エラー: ${validationResult.errors.length}件`);
  console.log(`   警告: ${validationResult.warnings.length}件`);
  console.log('');

  if (validationResult.valid) {
    console.log('🎉 シフト生成システムは正常に動作しています！');
  } else {
    console.log('⚠️ バリデーションエラーがあります。LLMのプロンプトまたはロジックを見直してください。');
  }

  console.log('');
}

testShiftGeneration1Week().catch(console.error);
