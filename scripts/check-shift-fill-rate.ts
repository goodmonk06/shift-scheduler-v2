/**
 * シフト埋まり率の詳細確認
 */

import { getDb } from '../server/db';
import { shifts, shiftDetails } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

async function checkShiftFillRate() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 シフト埋まり率の詳細確認');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // 12月のシフトを取得
    const decemberShifts = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.year, 2025),
        eq(shifts.month, 12)
      ))
      .orderBy(desc(shifts.updatedAt));

    console.log('📅 2025年12月のシフト一覧:');
    console.log('─'.repeat(60));

    for (const shift of decemberShifts) {
      console.log(`\nシフトID: ${shift.id}`);
      console.log(`  名前: ${shift.name}`);
      console.log(`  ステータス: ${shift.status}`);
      console.log(`  生成方法: ${shift.generatedBy || 'manual'}`);
      console.log(`  更新日時: ${shift.updatedAt?.toLocaleString('ja-JP')}`);

      // シフト詳細を取得
      const details = await db
        .select()
        .from(shiftDetails)
        .where(eq(shiftDetails.shiftId, shift.id));

      console.log(`  詳細数: ${details.length}件`);

      if (details.length > 0) {
        // 生成方法別の集計
        const byMethod: Record<string, number> = {};
        const byDate: Record<string, number> = {};

        for (const detail of details) {
          // 生成方法別
          const method = detail.generatedBy || 'manual';
          byMethod[method] = (byMethod[method] || 0) + 1;

          // 日付別
          byDate[detail.date] = (byDate[detail.date] || 0) + 1;
        }

        console.log('\n  生成方法別内訳:');
        Object.entries(byMethod).forEach(([method, count]) => {
          const percentage = ((count / details.length) * 100).toFixed(1);
          console.log(`    ${method}: ${count}件 (${percentage}%)`);
        });

        const totalDays = Object.keys(byDate).length;
        const avgPerDay = details.length / totalDays;

        console.log('\n  日別統計:');
        console.log(`    カバー日数: ${totalDays}日`);
        console.log(`    平均配置数/日: ${avgPerDay.toFixed(1)}件`);

        // シフト埋まり率の計算
        // 1日あたりの必要枠数: 6枠 × 平均4人 = 24枠（調整可能）
        const slotsPerDay = 20; // より現実的な値
        const expectedTotal = slotsPerDay * 31; // 12月は31日
        const fillRate = (details.length / expectedTotal) * 100;

        console.log('\n  📈 埋まり率計算:');
        console.log(`    想定枠数/日: ${slotsPerDay}枠`);
        console.log(`    想定総枠数: ${expectedTotal}枠`);
        console.log(`    実際の配置数: ${details.length}枠`);
        console.log(`    埋まり率: ${fillRate.toFixed(1)}%`);

        if (fillRate >= 85) {
          console.log(`    ✅ 目標達成（85%以上）`);
        } else if (fillRate >= 70) {
          console.log(`    ⚠️ 目標未達（70-85%）`);
        } else {
          console.log(`    ❌ 要改善（70%未満）`);
        }
      }

      console.log('\n' + '─'.repeat(60));
    }

    // 最新のシフトの詳細分析
    if (decemberShifts.length > 0) {
      const latestShift = decemberShifts.find(s =>
        s.status === 'ai_generated' || s.generatedBy === 'rule_based'
      ) || decemberShifts[0];

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 最新生成シフトの詳細分析');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const details = await db
        .select()
        .from(shiftDetails)
        .where(eq(shiftDetails.shiftId, latestShift.id));

      // 日付別の詳細分析
      const dateAnalysis: Record<string, {
        total: number;
        bySlot: Record<number, number>;
      }> = {};

      for (const detail of details) {
        if (!dateAnalysis[detail.date]) {
          dateAnalysis[detail.date] = { total: 0, bySlot: {} };
        }
        dateAnalysis[detail.date].total++;
        dateAnalysis[detail.date].bySlot[detail.workTimeSlotId] =
          (dateAnalysis[detail.date].bySlot[detail.workTimeSlotId] || 0) + 1;
      }

      // 不足している日を特定
      const allDates = Array.from({ length: 31 }, (_, i) => {
        const day = String(i + 1).padStart(2, '0');
        return `2025-12-${day}`;
      });

      const missingDates = allDates.filter(date => !dateAnalysis[date]);
      const underStaffedDates = allDates.filter(date =>
        dateAnalysis[date] && dateAnalysis[date].total < 15 // 15枠未満を人手不足とする
      );

      console.log(`シフトID: ${latestShift.id} - ${latestShift.name}`);
      console.log(`総配置数: ${details.length}件`);
      console.log(`カバー日数: ${Object.keys(dateAnalysis).length}/31日`);

      if (missingDates.length > 0) {
        console.log(`\n⚠️ シフト未作成の日: ${missingDates.length}日`);
        console.log(`  ${missingDates.slice(0, 5).join(', ')}${missingDates.length > 5 ? '...' : ''}`);
      }

      if (underStaffedDates.length > 0) {
        console.log(`\n⚠️ 人手不足の日: ${underStaffedDates.length}日`);
        underStaffedDates.slice(0, 5).forEach(date => {
          const data = dateAnalysis[date];
          console.log(`  ${date}: ${data.total}枠のみ`);
        });
      }

      // 最終的な埋まり率
      const expectedTotal = 20 * 31; // 620枠
      const fillRate = (details.length / expectedTotal) * 100;

      console.log('\n📊 最終評価:');
      console.log(`  埋まり率: ${fillRate.toFixed(1)}%`);
      console.log(`  目標達成: ${fillRate >= 85 ? '✅ 達成' : '❌ 未達成'}`);
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkShiftFillRate().catch(console.error);