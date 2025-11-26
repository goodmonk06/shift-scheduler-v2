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
 * Phase 2: 基本配置
 * 夜勤・日勤を職員条件・職場条件で配置
 *
 * TODO: 今後実装（12月ロジック参照）
 * - 夜勤可能職員を抽出
 * - 連続勤務チェック
 * - 必要人数充足
 * - 公平性考慮
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
  console.log('TODO: 今後実装（12月ロジック参照）');

  // 現時点では空配列を返す
  return [];
}

/**
 * Phase 3: 統計計算
 * 全職員の勤務統計を計算
 *
 * TODO: 今後実装
 * - calculateShiftStatsを使用
 * - 職員ごとの統計をログ出力
 *
 * @param shiftId シフトID
 * @param year 年
 * @param month 月
 * @param allShifts 全シフト詳細
 */
export async function phase3_calculateStats(
  shiftId: number,
  year: number,
  month: number,
  allShifts: InsertShiftDetail[]
): Promise<void> {
  console.log('\n=== Phase 3: 統計計算 ===');
  console.log('TODO: 今後実装');
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

  // Phase 2: 基本配置（今後実装）
  const phase2Shifts = await phase2_basicPlacement(shiftId, year, month, phase1Shifts);

  // Phase 2のシフトをDBに保存
  for (const shiftDetail of phase2Shifts) {
    await db.createShiftDetail(shiftDetail);
  }

  // Phase 3: 統計計算（今後実装）
  const allShifts = [...phase1Shifts, ...phase2Shifts];
  await phase3_calculateStats(shiftId, year, month, allShifts);

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
