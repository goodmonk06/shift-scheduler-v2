/**
 * 2025年12月シフトをAIで最適化
 * ルールベース生成(95.5%)をベースに、gpt-4oで残りを最適化
 */

import { generateShiftWithAI } from '../server/aiShiftGenerator';
import { getDb } from '../server/db';
import { shifts, shiftDetails } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function optimizeDecemberShiftWithAI() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 2025年12月シフト - AI最適化実行 (gpt-4o)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const testYear = 2025;
  const testMonth = 12;
  const shiftId = 8;

  // 現在の状態を確認
  const existingShift = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, shiftId))
    .limit(1);

  if (existingShift.length === 0) {
    throw new Error('12月シフト(ID: 8)が見つかりません');
  }

  console.log(`📌 最適化対象シフト:`);
  console.log(`   ID: ${shiftId}`);
  console.log(`   名前: ${existingShift[0].name}`);
  console.log(`   現在のステータス: ${existingShift[0].status}`);
  console.log(`   生成方法: ${existingShift[0].generatedBy}\n`);

  // 現在の配置状況を確認
  const currentDetails = await db
    .select()
    .from(shiftDetails)
    .where(eq(shiftDetails.shiftId, shiftId));

  console.log(`📊 現在の配置状況:`);
  console.log(`   シフト詳細数: ${currentDetails.length}件`);

  const byGeneratedBy = currentDetails.reduce((acc, detail) => {
    const key = detail.generatedBy || 'manual';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`   生成方法別内訳:`);
  Object.entries(byGeneratedBy).forEach(([method, count]) => {
    console.log(`     - ${method}: ${count}件`);
  });

  // 埋まり率を計算
  const expectedSlotsPerDay = 20; // 6枠 × 平均3.3人
  const expectedTotalSlots = expectedSlotsPerDay * 31;
  const currentFillRate = (currentDetails.length / expectedTotalSlots) * 100;

  console.log(`\n   現在の埋まり率: ${currentFillRate.toFixed(1)}%`);
  console.log(`   目標埋まり率: 95.0%以上\n`);

  // ━━━ AI最適化実行 ━━━
  console.log('━━━ gpt-4oでAI最適化実行 ━━━\n');
  console.log('⏳ 処理中... (数分かかる場合があります)\n');

  const startTime = Date.now();

  try {
    await generateShiftWithAI({
      shiftId: shiftId,
      year: testYear,
      month: testMonth,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ AI最適化 成功 (所要時間: ${duration}秒)\n`);

  } catch (error: any) {
    console.error('\n❌ AI最適化 失敗\n');
    console.error('エラー:', error.message);
    if (error.stack) {
      console.error('\nスタック:');
      console.error(error.stack);
    }
    throw error;
  }

  // ━━━ 最適化後の結果検証 ━━━
  console.log('━━━ 最適化後の結果検証 ━━━\n');

  const optimizedDetails = await db
    .select()
    .from(shiftDetails)
    .where(eq(shiftDetails.shiftId, shiftId));

  console.log(`📊 最適化後の配置状況:`);
  console.log(`   シフト詳細数: ${optimizedDetails.length}件 (${optimizedDetails.length - currentDetails.length >= 0 ? '+' : ''}${optimizedDetails.length - currentDetails.length})`);

  const optimizedByMethod = optimizedDetails.reduce((acc, detail) => {
    const key = detail.generatedBy || 'manual';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`   生成方法別内訳:`);
  Object.entries(optimizedByMethod).forEach(([method, count]) => {
    const delta = count - (byGeneratedBy[method] || 0);
    console.log(`     - ${method}: ${count}件 (${delta >= 0 ? '+' : ''}${delta})`);
  });

  const optimizedFillRate = (optimizedDetails.length / expectedTotalSlots) * 100;
  const improvement = optimizedFillRate - currentFillRate;

  console.log(`\n📈 埋まり率の改善:`);
  console.log(`   最適化前: ${currentFillRate.toFixed(1)}%`);
  console.log(`   最適化後: ${optimizedFillRate.toFixed(1)}% (${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%)`);

  // シフトのステータスを更新
  await db
    .update(shifts)
    .set({
      status: 'ai_generated',
      generatedBy: 'ai',
      updatedAt: new Date(),
    })
    .where(eq(shifts.id, shiftId));

  console.log('\n✅ シフトステータスを更新しました (ai_generated)\n');

  // ━━━ 最終結果 ━━━
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 2025年12月シフト AI最適化完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`   シフトID: ${shiftId}`);
  console.log(`   期間: ${testYear}年${testMonth}月`);
  console.log(`   最適化後詳細数: ${optimizedDetails.length}件`);
  console.log(`   最終埋まり率: ${optimizedFillRate.toFixed(1)}%`);
  console.log(`   改善幅: ${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%`);

  if (optimizedFillRate >= 95) {
    console.log('\n🏆 目標埋まり率（95%）を達成しました！');
  } else if (optimizedFillRate >= 85) {
    console.log('\n✅ 最低目標（85%）は達成しています');
  } else {
    console.log(`\n⚠️ 埋まり率が目標に達していません`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    shiftId,
    beforeCount: currentDetails.length,
    afterCount: optimizedDetails.length,
    improvement: optimizedDetails.length - currentDetails.length,
    beforeFillRate: currentFillRate.toFixed(1),
    afterFillRate: optimizedFillRate.toFixed(1),
    improvementRate: improvement.toFixed(1),
  };
}

optimizeDecemberShiftWithAI().catch((error) => {
  console.error('\n💥 致命的エラー:', error);
  process.exit(1);
});
