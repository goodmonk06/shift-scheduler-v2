/**
 * 2025年12月シフト生成（フルフロー実行）
 */

import { generateShiftRuleBased } from '../server/ruleBasedShiftGeneratorApi';
import { getDb } from '../server/db';
import { shifts, shiftDetails } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function generateDecember2025Shift() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 2025年12月シフト生成 - フルフロー実行');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const testYear = 2025;
  const testMonth = 12;

  // 既存のドラフトシフト（ID: 8）を使用
  const existingShift = await db
    .select()
    .from(shifts)
    .where(and(
      eq(shifts.id, 8),
      eq(shifts.year, testYear),
      eq(shifts.month, testMonth)
    ))
    .limit(1);

  if (existingShift.length === 0) {
    throw new Error('12月のドラフトシフトが見つかりません');
  }

  const shiftId = existingShift[0].id;
  console.log(`📌 使用するシフトID: ${shiftId}`);
  console.log(`   名前: ${existingShift[0].name}`);
  console.log(`   現在のステータス: ${existingShift[0].status}\n`);

  // 既存のシフト詳細を一旦クリア
  console.log('🗑️ 既存のシフト詳細をクリア...');
  await db
    .delete(shiftDetails)
    .where(eq(shiftDetails.shiftId, shiftId));

  // ━━━ ルールベースシフト生成実行 ━━━
  console.log('\n━━━ ルールベースシフト生成実行 ━━━\n');

  try {
    await generateShiftRuleBased({
      shiftId: shiftId,
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

  // ━━━ 結果検証 ━━━
  console.log('━━━ 結果検証 ━━━\n');

  // シフト詳細を取得
  const generatedDetails = await db
    .select()
    .from(shiftDetails)
    .where(eq(shiftDetails.shiftId, shiftId));

  console.log(`📊 生成されたシフト詳細数: ${generatedDetails.length}件`);

  // 生成方法別の集計
  const byGeneratedBy = generatedDetails.reduce((acc, detail) => {
    const key = detail.generatedBy || 'manual';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📈 生成方法別の内訳:');
  Object.entries(byGeneratedBy).forEach(([method, count]) => {
    console.log(`   ${method}: ${count}件`);
  });

  // 日別の配置数を集計
  const byDate = generatedDetails.reduce((acc, detail) => {
    acc[detail.date] = (acc[detail.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalDays = Object.keys(byDate).length;
  const totalSlots = Object.values(byDate).reduce((sum, count) => sum + count, 0);
  const avgSlotsPerDay = totalSlots / totalDays;

  console.log('\n📆 日別配置統計:');
  console.log(`   対象日数: ${totalDays}日`);
  console.log(`   総配置数: ${totalSlots}件`);
  console.log(`   平均配置数/日: ${avgSlotsPerDay.toFixed(1)}件`);

  // シフト埋まり率の計算（簡易版）
  // 想定: 1日あたり6枠 × 5人 = 30枠として計算
  const expectedSlotsPerDay = 30;
  const expectedTotalSlots = expectedSlotsPerDay * 31; // 12月は31日
  const fillRate = (totalSlots / expectedTotalSlots) * 100;

  console.log('\n📊 シフト埋まり率:');
  console.log(`   想定総枠数: ${expectedTotalSlots}枠`);
  console.log(`   実際の配置数: ${totalSlots}枠`);
  console.log(`   埋まり率: ${fillRate.toFixed(1)}%`);

  // シフトのステータスを更新
  await db
    .update(shifts)
    .set({
      status: 'ai_generated',
      generatedBy: 'rule_based',
      updatedAt: new Date(),
    })
    .where(eq(shifts.id, shiftId));

  console.log('\n✅ シフトステータスを更新しました');

  // ━━━ 最終結果 ━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 2025年12月シフト生成完了サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`   シフトID: ${shiftId}`);
  console.log(`   期間: ${testYear}年${testMonth}月`);
  console.log(`   生成詳細数: ${generatedDetails.length}件`);
  console.log(`   埋まり率: ${fillRate.toFixed(1)}%`);

  if (fillRate >= 85) {
    console.log('\n🎉 目標埋まり率（85%）を達成しました！');
  } else {
    console.log(`\n⚠️ 埋まり率が目標（85%）に達していません`);
    console.log('   AI生成で補完することを推奨します');
  }

  return {
    shiftId,
    totalDetails: generatedDetails.length,
    fillRate: fillRate.toFixed(1),
    byGeneratedBy,
  };
}

generateDecember2025Shift().catch(console.error);