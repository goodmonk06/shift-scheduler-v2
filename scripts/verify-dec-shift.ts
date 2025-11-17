/**
 * 2025年12月シフトの詳細検証
 */

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { shifts, shiftDetails, employees, workTimeSlots } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

dotenv.config();

async function verifyDecemberShift() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 2025年12月シフト詳細検証');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });

  const db = drizzle(connection);

  try {
    // 12月のシフトを取得
    const decemberShifts = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.year, 2025),
        eq(shifts.month, 12)
      ));

    console.log('📅 12月のシフト一覧:');
    for (const shift of decemberShifts) {
      console.log(`   ID: ${shift.id} - ${shift.name} (${shift.status})`);
    }
    console.log('');

    // 各シフトの詳細を確認
    for (const shift of decemberShifts) {
      console.log(`\n━━━ シフトID: ${shift.id} - ${shift.name} ━━━\n`);

      // シフト詳細を取得
      const details = await db
        .select({
          id: shiftDetails.id,
          date: shiftDetails.date,
          employeeId: shiftDetails.employeeId,
          workTimeSlotId: shiftDetails.workTimeSlotId,
          generatedBy: shiftDetails.generatedBy,
        })
        .from(shiftDetails)
        .where(eq(shiftDetails.shiftId, shift.id))
        .orderBy(shiftDetails.date);

      console.log(`   シフト詳細数: ${details.length}件`);

      if (details.length > 0) {
        // 生成方法別の集計
        const byMethod = details.reduce((acc, d) => {
          const method = d.generatedBy || 'manual';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log('   生成方法別:');
        Object.entries(byMethod).forEach(([method, count]) => {
          console.log(`     ${method}: ${count}件`);
        });

        // 日別配置数
        const byDate = details.reduce((acc, d) => {
          acc[d.date] = (acc[d.date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const dates = Object.keys(byDate);
        const totalSlots = Object.values(byDate).reduce((sum, count) => sum + count, 0);
        const avgPerDay = totalSlots / dates.length;

        console.log(`   日別統計: ${dates.length}日間, 平均${avgPerDay.toFixed(1)}件/日`);

        // シフト埋まり率計算
        const expectedPerDay = 20; // 6枠 × 平均必要人数
        const expectedTotal = expectedPerDay * 31;
        const fillRate = (totalSlots / expectedTotal) * 100;

        console.log(`   埋まり率: ${fillRate.toFixed(1)}% (${totalSlots}/${expectedTotal}枠)`);

        // サンプル表示（最初の5件）
        console.log('\n   サンプル（最初の5件）:');
        details.slice(0, 5).forEach(d => {
          console.log(`     ${d.date} - 職員ID:${d.employeeId} 枠ID:${d.workTimeSlotId} [${d.generatedBy}]`);
        });
      }
    }

    // 全体サマリー
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 全体サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 最新のai_generatedシフトを特定
    const latestAiShift = decemberShifts
      .filter(s => s.status === 'ai_generated' || s.generatedBy === 'rule_based')
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0];

    if (latestAiShift) {
      const details = await db
        .select()
        .from(shiftDetails)
        .where(eq(shiftDetails.shiftId, latestAiShift.id));

      const totalSlots = details.length;
      const expectedTotal = 20 * 31; // 620枠
      const fillRate = (totalSlots / expectedTotal) * 100;

      console.log('🎯 最新生成シフト:');
      console.log(`   シフトID: ${latestAiShift.id}`);
      console.log(`   シフト名: ${latestAiShift.name}`);
      console.log(`   ステータス: ${latestAiShift.status}`);
      console.log(`   生成方法: ${latestAiShift.generatedBy}`);
      console.log(`   詳細数: ${totalSlots}件`);
      console.log(`   埋まり率: ${fillRate.toFixed(1)}%`);

      if (fillRate >= 85) {
        console.log('\n   ✅ 目標埋まり率（85%）達成！');
      } else {
        console.log(`\n   ⚠️ 埋まり率が目標（85%）未満です`);
      }
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  } finally {
    await connection.end();
  }
}

verifyDecemberShift().catch(console.error);