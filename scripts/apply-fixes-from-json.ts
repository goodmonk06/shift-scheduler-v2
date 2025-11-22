/**
 * JSONファイルから修正データを読み込んでデータベースに反映
 * Railway環境で実行すること
 *
 * 実行方法:
 * pnpm tsx scripts/apply-fixes-from-json.ts
 */

import { getDb } from '../server/db';
import { eq, and } from 'drizzle-orm';
import { shiftDetails, employees, shifts } from '../drizzle/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

interface FixData {
  employeeName: string;
  date: string;
  displayText: string | null;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
  leaveType: string | null;
  isLocked: boolean;
  note: string;
}

interface FixesJson {
  description: string;
  targetShift: {
    year: number;
    month: number;
  };
  fixes: FixData[];
}

async function main() {
  console.log('=== JSONファイルから修正データを適用 ===\n');

  const db = await getDb();
  if (!db) {
    throw new Error('データベース接続に失敗しました');
  }

  // JSONファイルを読み込み
  const jsonPath = join(process.cwd(), 'data/december-shifts/fixes-2025-12.json');
  const jsonContent = readFileSync(jsonPath, 'utf-8');
  const fixesData: FixesJson = JSON.parse(jsonContent);

  console.log(`説明: ${fixesData.description}`);
  console.log(`対象: ${fixesData.targetShift.year}年${fixesData.targetShift.month}月\n`);

  // 対象シフトを取得
  const targetShifts = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.year, fixesData.targetShift.year),
        eq(shifts.month, fixesData.targetShift.month)
      )
    )
    .orderBy(shifts.createdAt)
    .limit(1);

  if (targetShifts.length === 0) {
    throw new Error(
      `${fixesData.targetShift.year}年${fixesData.targetShift.month}月のシフトが見つかりません`
    );
  }

  const shiftId = targetShifts[0].id;
  console.log(`シフトID: ${shiftId}`);
  console.log(`シフト名: ${targetShifts[0].name}\n`);

  console.log(`修正件数: ${fixesData.fixes.length}件\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let updatedCount = 0;
  let insertedCount = 0;

  for (let i = 0; i < fixesData.fixes.length; i++) {
    const fix = fixesData.fixes[i];
    const index = i + 1;

    console.log(`[${index}/${fixesData.fixes.length}] ${fix.employeeName} ${fix.date}`);
    console.log(`  → ${fix.displayText} (${fix.note})`);

    // 職員IDを取得
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.name, fix.employeeName))
      .limit(1);

    if (employee.length === 0) {
      console.log(`  ⚠️  職員が見つかりません: ${fix.employeeName}\n`);
      continue;
    }

    const employeeId = employee[0].id;

    // 修正前の状態を確認
    const existing = await db
      .select()
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.employeeId, employeeId),
          eq(shiftDetails.date, fix.date)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`  修正前: ${existing[0].displayText || '(なし)'}`);
    } else {
      console.log(`  修正前: (データなし)`);
    }

    // データを更新または挿入
    const updateData = {
      displayText: fix.displayText,
      status: fix.status,
      startTime: fix.startTime,
      endTime: fix.endTime,
      leaveType: fix.leaveType,
      isLocked: fix.isLocked,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      // 更新
      await db
        .update(shiftDetails)
        .set(updateData)
        .where(eq(shiftDetails.id, existing[0].id));

      console.log(`  ✓ 更新しました`);
      updatedCount++;
    } else {
      // 新規挿入
      await db.insert(shiftDetails).values({
        shiftId,
        employeeId,
        date: fix.date,
        ...updateData,
        generatedBy: 'manual',
        createdAt: new Date(),
      });

      console.log(`  ✓ 新規追加しました`);
      insertedCount++;
    }

    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ すべての修正が完了しました！`);
  console.log(`  更新: ${updatedCount}件`);
  console.log(`  追加: ${insertedCount}件`);
  console.log(`  合計: ${updatedCount + insertedCount}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
