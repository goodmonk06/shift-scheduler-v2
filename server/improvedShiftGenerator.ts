/**
 * 改善されたシフト生成モジュール
 *
 * 主な改善点:
 * 1. 承認済み希望休・勤務希望を固定データとして扱う
 * 2. 研修データの別管理（勤務人数にカウントしない）
 * 3. リセット時の固定データ保護
 * 4. 明確なデータ分離
 */

import { getDb } from "./db";
import {
  shifts,
  shiftDetails,
  leaveRequests,
  workPreferences,
  employees,
  workTimeSlots
} from "../drizzle/schema";
import { and, eq, gte, lte, or, inArray, not, sql } from "drizzle-orm";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface FixedConstraint {
  employeeId: number;
  date: string;
  type: 'leave' | 'work';
  details: {
    startTime?: string;
    endTime?: string;
    leaveType?: string;
    preferenceType?: string;
    isCountAsStaff?: boolean;
    reason?: string;
  };
  sourceId: number;
  sourceType: 'leave_request' | 'work_preference';
}

interface GenerationOptions {
  keepApprovedRequests: boolean;
  keepManualEdits: boolean;
  useAI: boolean;
  usePhased: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 1: 固定データの読み込み
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function loadFixedConstraints(
  shiftId: number,
  year: number,
  month: number
): Promise<FixedConstraint[]> {
  console.log('\n📌 固定データの読み込み...');

  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");

  const constraints: FixedConstraint[] = [];

  // 期間の計算
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  // 1. 承認済み希望休の読み込み
  const approvedLeaves = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.status, 'approved'),
        gte(leaveRequests.startDate, startDate),
        lte(leaveRequests.endDate, endDate)
      )
    );

  for (const leave of approvedLeaves) {
    const dates = generateDateRange(leave.startDate, leave.endDate);
    for (const date of dates) {
      constraints.push({
        employeeId: leave.employeeId,
        date,
        type: 'leave',
        details: {
          leaveType: leave.leaveType,
          reason: leave.reason || undefined
        },
        sourceId: leave.id,
        sourceType: 'leave_request'
      });
    }
  }

  console.log(`  ✅ 希望休: ${approvedLeaves.length}件`);

  // 2. 承認済み勤務希望の読み込み
  const approvedWorkPrefs = await db
    .select()
    .from(workPreferences)
    .where(
      and(
        eq(workPreferences.status, 'approved'),
        gte(workPreferences.startDate, startDate),
        lte(workPreferences.endDate, endDate)
      )
    );

  for (const pref of approvedWorkPrefs) {
    const dates = generateDateRange(pref.startDate, pref.endDate);
    for (const date of dates) {
      constraints.push({
        employeeId: pref.employeeId,
        date,
        type: 'work',
        details: {
          startTime: pref.startTime,
          endTime: pref.endTime,
          preferenceType: (pref as any).preferenceType || 'time_specified',
          isCountAsStaff: (pref as any).isCountAsStaff !== false,
          reason: pref.reason || undefined
        },
        sourceId: pref.id,
        sourceType: 'work_preference'
      });
    }
  }

  console.log(`  ✅ 勤務希望: ${approvedWorkPrefs.length}件`);
  console.log(`  📊 合計: ${constraints.length}件の固定制約`);

  return constraints;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 2: 固定シフトの生成
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateFixedShifts(
  shiftId: number,
  constraints: FixedConstraint[]
): Promise<any[]> {
  console.log('\n🔒 固定シフトの生成...');

  const fixedShifts: any[] = [];

  for (const constraint of constraints) {
    if (constraint.type === 'leave') {
      // 希望休を固定シフトとして登録
      fixedShifts.push({
        shiftId,
        employeeId: constraint.employeeId,
        date: constraint.date,
        status: 'requested_off',
        timeSlotId: null,
        leaveType: constraint.details.leaveType,
        startTime: null,
        endTime: null,
        generatedBy: 'leave_request',
        isFixed: true,
        sourceType: 'leave_request',
        sourceId: constraint.sourceId,
        isChanged: false
      });
    } else if (constraint.type === 'work') {
      // 勤務希望を固定シフトとして登録
      const status = constraint.details.preferenceType === 'training' ? 'working' : 'working';

      fixedShifts.push({
        shiftId,
        employeeId: constraint.employeeId,
        date: constraint.date,
        status,
        timeSlotId: null, // カスタム時間
        leaveType: null,
        startTime: constraint.details.startTime,
        endTime: constraint.details.endTime,
        generatedBy: 'rule_based',
        isFixed: true,
        sourceType: 'work_preference',
        sourceId: constraint.sourceId,
        isChanged: false,
        // 研修の場合は追加メタデータ
        ...(constraint.details.preferenceType === 'training' && {
          metadata: {
            isCountAsStaff: false,
            displayIcon: '！',
            reason: constraint.details.reason
          }
        })
      });
    }
  }

  console.log(`  ✅ ${fixedShifts.length}件の固定シフトを生成`);

  // タイプ別の統計
  const leaveCount = fixedShifts.filter(s => s.status === 'requested_off').length;
  const workCount = fixedShifts.filter(s => s.status === 'working').length;
  const trainingCount = fixedShifts.filter(s => s.metadata?.isCountAsStaff === false).length;

  console.log(`     - 希望休: ${leaveCount}件`);
  console.log(`     - 勤務希望: ${workCount}件（うち研修: ${trainingCount}件）`);

  return fixedShifts;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 3: リセット機能（固定データ保護）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function resetShifts(
  shiftId: number,
  options: GenerationOptions = {
    keepApprovedRequests: true,
    keepManualEdits: false,
    useAI: false,
    usePhased: true
  }
): Promise<{ deletedCount: number; keptCount: number }> {
  console.log('\n🔄 シフトのリセット...');
  console.log(`  オプション:`, options);

  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");

  let deletedCount = 0;
  let keptCount = 0;

  if (options.keepApprovedRequests) {
    // 固定データ以外を削除
    const result = await db
      .delete(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          or(
            eq(shiftDetails.isFixed, false),
            sql`${shiftDetails.isFixed} IS NULL`
          )
        )
      );

    deletedCount = result.rowsAffected || 0;

    // 固定データの数を取得
    const keptResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.isFixed, true)
        )
      );

    keptCount = keptResult[0]?.count || 0;
  } else {
    // すべて削除
    const result = await db
      .delete(shiftDetails)
      .where(eq(shiftDetails.shiftId, shiftId));

    deletedCount = result.rowsAffected || 0;
  }

  console.log(`  ✅ リセット完了:`);
  console.log(`     - 削除: ${deletedCount}件`);
  console.log(`     - 保持: ${keptCount}件（固定データ）`);

  return { deletedCount, keptCount };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step 4: 改善されたシフト生成メイン処理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateImprovedShift(
  shiftId: number,
  year: number,
  month: number,
  options: GenerationOptions = {
    keepApprovedRequests: true,
    keepManualEdits: false,
    useAI: false,
    usePhased: true
  }
): Promise<{
  fixedShifts: any[];
  generatedShifts: any[];
  totalShifts: number;
  statistics: any;
}> {
  console.log(`\n🚀 改善されたシフト生成開始: ${year}年${month}月`);
  console.log(`  シフトID: ${shiftId}`);

  const db = await getDb();
  if (!db) throw new Error("データベース接続エラー");

  // 1. 既存シフトのリセット（オプション）
  if (options.keepApprovedRequests) {
    await resetShifts(shiftId, options);
  }

  // 2. 固定制約の読み込み
  const fixedConstraints = await loadFixedConstraints(shiftId, year, month);

  // 3. 固定シフトの生成
  const fixedShifts = await generateFixedShifts(shiftId, fixedConstraints);

  // 4. 固定シフトをデータベースに保存
  if (fixedShifts.length > 0) {
    await db.insert(shiftDetails).values(fixedShifts);
    console.log(`  ✅ 固定シフトを保存: ${fixedShifts.length}件`);
  }

  // 5. 勤務可能枠の計算（固定シフトを考慮）
  // 注：ひとまず既存のphaseBasedShiftGeneratorを活用
  const availabilityMap = await calculateAvailabilityWithFixed(
    shiftId,
    year,
    month,
    fixedShifts
  );

  // 6. AI/ルールベース生成（固定シフトは既に保存済みなのでそれ以外を生成）
  let generatedShifts: any[] = [];

  if (options.usePhased) {
    // 段階的生成を使用（固定シフトを考慮した生成）
    const { phase2_calculateAvailability, phase3_ruleBasedAssignment } = await import("./phaseBasedShiftGenerator");

    // Phase 2: 勤務可能枠の計算（固定シフトを考慮）
    const availabilityMapPhase = await phase2_calculateAvailability(shiftId, year, month, fixedShifts);

    // Phase 3: ルールベース配置（固定シフト以外を生成）
    generatedShifts = await phase3_ruleBasedAssignment(shiftId, year, month, fixedShifts, availabilityMapPhase);

    // 生成されたシフトをデータベースに保存
    if (generatedShifts.length > 0) {
      // isFixed=falseで保存（生成データ）
      const shiftsToSave = generatedShifts.map(shift => ({
        ...shift,
        isFixed: false,
        sourceType: shift.generatedBy || 'rule_based'
      }));
      await db.insert(shiftDetails).values(shiftsToSave);
      console.log(`  ✅ 生成シフトを保存: ${generatedShifts.length}件`);
    }
  } else if (options.useAI) {
    // AI生成を使用
    const { generateShiftWithAI } = await import("./aiShiftGenerator");
    // AI生成のロジックを呼び出す
    console.log("  ⚠️ AI生成は別途実装が必要です");
  }

  // 7. 統計情報の計算
  const statistics = calculateStatistics(fixedShifts, generatedShifts);

  console.log('\n✅ シフト生成完了');
  console.log(`  📊 統計:`);
  console.log(`     - 固定シフト: ${fixedShifts.length}件`);
  console.log(`     - 生成シフト: ${generatedShifts.length}件`);
  console.log(`     - 合計: ${fixedShifts.length + generatedShifts.length}件`);

  return {
    fixedShifts,
    generatedShifts,
    totalShifts: fixedShifts.length + generatedShifts.length,
    statistics
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ヘルパー関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

async function calculateAvailabilityWithFixed(
  shiftId: number,
  year: number,
  month: number,
  fixedShifts: any[]
): Promise<Map<string, any>> {
  // 固定シフトを考慮した勤務可能枠の計算
  const availabilityMap = new Map<string, any>();

  // TODO: 実装
  console.log("  ⚠️ 勤務可能枠の計算は既存ロジックを使用");

  return availabilityMap;
}

function calculateStatistics(fixedShifts: any[], generatedShifts: any[]): any {
  const allShifts = [...fixedShifts, ...generatedShifts];

  // 職員別の統計
  const employeeStats = new Map<number, {
    workDays: number;
    offDays: number;
    trainingDays: number;
  }>();

  for (const shift of allShifts) {
    if (!employeeStats.has(shift.employeeId)) {
      employeeStats.set(shift.employeeId, {
        workDays: 0,
        offDays: 0,
        trainingDays: 0
      });
    }

    const stats = employeeStats.get(shift.employeeId)!;

    if (shift.status === 'requested_off' || shift.status === 'off') {
      stats.offDays++;
    } else if (shift.metadata?.isCountAsStaff === false) {
      stats.trainingDays++;
    } else {
      stats.workDays++;
    }
  }

  return {
    totalShifts: allShifts.length,
    fixedShifts: fixedShifts.length,
    generatedShifts: generatedShifts.length,
    employeeStats: Array.from(employeeStats.entries()).map(([id, stats]) => ({
      employeeId: id,
      ...stats
    }))
  };
}