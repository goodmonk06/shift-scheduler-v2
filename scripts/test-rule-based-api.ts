/**
 * ルールベースシフト生成API統合テスト
 *
 * ruleBasedShiftGeneratorApi.tsの動作確認
 */

import { generateShiftRuleBased } from '../server/ruleBasedShiftGeneratorApi';
import { getDb } from '../server/db';
import { shifts } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function testRuleBasedAPI() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 ルールベースシフト生成API統合テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // テスト用のシフトを作成
  const testYear = 2025;
  const testMonth = 11;

  console.log('━━━ ステップ1: テスト用シフト作成 ━━━\n');

  // 既存のテストシフトを検索
  const existingShifts = await db
    .select()
    .from(shifts)
    .where(eq(shifts.name, 'テスト用シフト(API統合テスト)'))
    .limit(1);

  let testShiftId: number;

  if (existingShifts.length > 0) {
    testShiftId = existingShifts[0].id;
    console.log(`既存のテストシフトを使用: ID ${testShiftId}`);
  } else {
    // 新規作成
    const [newShift] = await db
      .insert(shifts)
      .values({
        year: testYear,
        month: testMonth,
        name: 'テスト用シフト(API統合テスト)',
        status: 'draft',
        generatedBy: 'manual',
        parentShiftId: null,
        leaveRequestDeadline: null,
        additionalRequestDeadline: null,
        userId: null,
      })
      .$returningId();

    testShiftId = newShift.id;
    console.log(`新規テストシフト作成: ID ${testShiftId}`);
  }

  console.log('');

  // ━━━ ステップ2: ルールベースシフト生成実行 ━━━
  console.log('━━━ ステップ2: ルールベースシフト生成実行 ━━━\n');

  try {
    await generateShiftRuleBased({
      shiftId: testShiftId,
      year: testYear,
      month: testMonth,
    });

    console.log('\n✅ ルールベースシフト生成 成功\n');
  } catch (error: any) {
    console.error('\n❌ ルールベースシフト生成 失敗\n');
    console.error('エラー:', error.message);
    console.error('スタック:', error.stack);
    throw error;
  }

  // ━━━ ステップ3: 結果検証 ━━━
  console.log('━━━ ステップ3: 結果検証 ━━━\n');

  const updatedShift = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, testShiftId))
    .limit(1);

  if (updatedShift.length === 0) {
    throw new Error('シフトが見つかりません');
  }

  const shift = updatedShift[0];

  console.log('シフト情報:');
  console.log(`  ID: ${shift.id}`);
  console.log(`  名前: ${shift.name}`);
  console.log(`  ステータス: ${shift.status}`);
  console.log(`  生成方法: ${shift.generatedBy}`);
  console.log('');

  // シフト詳細数を確認
  const shiftDetailsCount = await db.query.shiftDetails.findMany({
    where: (shiftDetails, { eq }) => eq(shiftDetails.shiftId, testShiftId),
  });

  console.log(`シフト詳細数: ${shiftDetailsCount.length}件`);
  console.log('');

  // ルールベース生成分のみを確認
  const ruleBasedDetails = shiftDetailsCount.filter(
    (d) => d.generatedBy === 'rule_based'
  );

  console.log(`ルールベース生成分: ${ruleBasedDetails.length}件`);
  console.log('');

  // ━━━ 最終結果 ━━━
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ルールベースシフト生成API統合テスト完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 テスト結果サマリー:');
  console.log(`   シフトID: ${testShiftId}`);
  console.log(`   期間: ${testYear}年${testMonth}月`);
  console.log(`   生成方法: ${shift.generatedBy}`);
  console.log(`   シフト詳細数: ${shiftDetailsCount.length}件`);
  console.log(`   ルールベース生成分: ${ruleBasedDetails.length}件`);
  console.log('');

  if (shift.generatedBy === 'rule_based' && ruleBasedDetails.length > 0) {
    console.log('🎉 API統合テストは正常に完了しました！');
  } else {
    console.log('⚠️ 期待する結果と異なります。確認が必要です。');
  }

  console.log('');
}

testRuleBasedAPI().catch(console.error);
