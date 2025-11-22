/**
 * 希望休修正スクリプト（段階的実行版）
 * Railway環境で実行すること
 *
 * 実行方法:
 * pnpm tsx scripts/fix-vacation-step-by-step.ts
 *
 * このスクリプトは各修正の前後で状態を表示し、
 * 他のデータが消えていないか確認できます
 */

import { getDb } from '../server/db';
import { eq, and } from 'drizzle-orm';
import { shiftDetails, employees, shifts } from '../drizzle/schema';

async function main() {
  console.log('=== 希望休修正スクリプト（段階的実行版）開始 ===\n');

  const db = await getDb();
  if (!db) {
    throw new Error('データベース接続に失敗しました');
  }

  // 最新の12月シフトを取得
  const decemberShifts = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.year, 2025), eq(shifts.month, 12)))
    .orderBy(shifts.createdAt)
    .limit(1);

  if (decemberShifts.length === 0) {
    throw new Error('12月シフトが見つかりません');
  }

  const shiftId = decemberShifts[0].id;
  console.log(`対象シフトID: ${shiftId}`);
  console.log(`シフト名: ${decemberShifts[0].name}\n`);

  // 職員IDを取得
  const getEmployeeId = async (name: string): Promise<number> => {
    const emp = await db
      .select()
      .from(employees)
      .where(eq(employees.name, name))
      .limit(1);

    if (emp.length === 0) {
      throw new Error(`職員が見つかりません: ${name}`);
    }
    return emp[0].id;
  };

  // 修正前の状態を表示
  const showBeforeState = async (
    employeeId: number,
    employeeName: string,
    date: string
  ) => {
    const existing = await db
      .select()
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.employeeId, employeeId),
          eq(shiftDetails.date, date)
        )
      )
      .limit(1);

    console.log(`\n【修正前】${employeeName} ${date}:`);
    if (existing.length > 0) {
      const d = existing[0];
      console.log(`  displayText: ${d.displayText || '(なし)'}`);
      console.log(`  status: ${d.status || '(なし)'}`);
      console.log(`  startTime: ${d.startTime || '(なし)'}`);
      console.log(`  endTime: ${d.endTime || '(なし)'}`);
      console.log(`  leaveType: ${d.leaveType || '(なし)'}`);
      console.log(`  isLocked: ${d.isLocked || false}`);
      console.log(`  generatedBy: ${d.generatedBy || '(なし)'}`);
    } else {
      console.log(`  データなし（新規作成）`);
    }
  };

  // 修正後の状態を表示
  const showAfterState = async (
    employeeId: number,
    employeeName: string,
    date: string
  ) => {
    const updated = await db
      .select()
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.employeeId, employeeId),
          eq(shiftDetails.date, date)
        )
      )
      .limit(1);

    console.log(`【修正後】${employeeName} ${date}:`);
    if (updated.length > 0) {
      const d = updated[0];
      console.log(`  displayText: ${d.displayText || '(なし)'}`);
      console.log(`  status: ${d.status || '(なし)'}`);
      console.log(`  startTime: ${d.startTime || '(なし)'}`);
      console.log(`  endTime: ${d.endTime || '(なし)'}`);
      console.log(`  leaveType: ${d.leaveType || '(なし)'}`);
      console.log(`  isLocked: ${d.isLocked || false}`);
      console.log(`  generatedBy: ${d.generatedBy || '(なし)'}`);
    } else {
      console.log(`  エラー: データが見つかりません`);
    }
  };

  // 修正を実行
  const applyUpdate = async (
    employeeId: number,
    employeeName: string,
    date: string,
    data: any,
    description: string
  ) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`【${description}】`);

    // 修正前の状態を表示
    await showBeforeState(employeeId, employeeName, date);

    // 既存データを確認
    const existing = await db
      .select()
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.employeeId, employeeId),
          eq(shiftDetails.date, date)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新
      await db
        .update(shiftDetails)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(shiftDetails.id, existing[0].id));

      console.log(`\n✓ 更新しました`);
    } else {
      // 新規挿入
      await db.insert(shiftDetails).values({
        shiftId,
        employeeId,
        ...data,
        generatedBy: 'manual',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`\n✓ 新規追加しました`);
    }

    // 修正後の状態を表示
    await showAfterState(employeeId, employeeName, date);
  };

  // ========== 修正1: 山口 夕香里 - 12/4 研修 ==========
  const yamaguchi = await getEmployeeId('山口 夕香里');
  await applyUpdate(
    yamaguchi,
    '山口 夕香里',
    '2025-12-04',
    {
      displayText: '研修',
      status: 'working',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: null,
    },
    '修正1/16: 山口 夕香里 12/4 研修追加'
  );

  // ========== 修正2-4: 松嵜 愛梨 - 12/31～1/2 ==========
  const matsuzaki = await getEmployeeId('松嵜 愛梨');

  await applyUpdate(
    matsuzaki,
    '松嵜 愛梨',
    '2025-12-31',
    {
      displayText: '夜',
      status: 'working',
      startTime: '16:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正2/16: 松嵜 愛梨 12/31 夜勤'
  );

  await applyUpdate(
    matsuzaki,
    '松嵜 愛梨',
    '2026-01-01',
    {
      displayText: '明',
      status: 'working',
      startTime: '00:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正3/16: 松嵜 愛梨 1/1 明け'
  );

  await applyUpdate(
    matsuzaki,
    '松嵜 愛梨',
    '2026-01-02',
    {
      displayText: '休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'off',
    },
    '修正4/16: 松嵜 愛梨 1/2 休み'
  );

  // ========== 修正5-8: 杉山 美佳子 ==========
  const sugiyama = await getEmployeeId('杉山 美佳子');

  await applyUpdate(
    sugiyama,
    '杉山 美佳子',
    '2025-12-05',
    {
      displayText: '休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'off',
    },
    '修正5/16: 杉山 美佳子 12/5 希望休追加'
  );

  await applyUpdate(
    sugiyama,
    '杉山 美佳子',
    '2026-01-01',
    {
      displayText: '夜',
      status: 'working',
      startTime: '16:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正6/16: 杉山 美佳子 1/1 夜勤'
  );

  await applyUpdate(
    sugiyama,
    '杉山 美佳子',
    '2026-01-02',
    {
      displayText: '明',
      status: 'working',
      startTime: '00:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正7/16: 杉山 美佳子 1/2 明け'
  );

  await applyUpdate(
    sugiyama,
    '杉山 美佳子',
    '2026-01-03',
    {
      displayText: '休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'off',
    },
    '修正8/16: 杉山 美佳子 1/3 休み'
  );

  // ========== 修正9-16: 梅田 英津子 ==========
  const umeda = await getEmployeeId('梅田 英津子');

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2025-12-03',
    {
      displayText: '休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'off',
    },
    '修正9/16: 梅田 英津子 12/3 希望休追加'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2025-12-28',
    {
      displayText: '有休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'yukyu',
    },
    '修正10/16: 梅田 英津子 12/28 有給追加'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2025-12-30',
    {
      displayText: '夜',
      status: 'working',
      startTime: '16:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正11/16: 梅田 英津子 12/30 夜勤'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2025-12-31',
    {
      displayText: '明',
      status: 'working',
      startTime: '00:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正12/16: 梅田 英津子 12/31 明け'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2026-01-01',
    {
      displayText: '休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'off',
    },
    '修正13/16: 梅田 英津子 1/1 休み'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2026-01-03',
    {
      displayText: '夜',
      status: 'working',
      startTime: '16:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正14/16: 梅田 英津子 1/3 夜勤'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2026-01-04',
    {
      displayText: '明',
      status: 'working',
      startTime: '00:00',
      endTime: '10:00',
      isLocked: true,
      leaveType: null,
    },
    '修正15/16: 梅田 英津子 1/4 明け'
  );

  await applyUpdate(
    umeda,
    '梅田 英津子',
    '2026-01-05',
    {
      displayText: '休',
      status: 'off',
      startTime: null,
      endTime: null,
      isLocked: true,
      leaveType: 'off',
    },
    '修正16/16: 梅田 英津子 1/5 休み'
  );

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ すべての修正が完了しました！`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
