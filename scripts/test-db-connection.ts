/**
 * データベース接続のテスト
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { shifts, shiftDetails } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

dotenv.config();

async function testConnection() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 データベース接続テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    return;
  }

  console.log('DATABASE_URL:', databaseUrl.substring(0, 30) + '...');

  try {
    // mysql2で直接接続
    const connection = await mysql.createConnection({
      uri: databaseUrl,
    });

    console.log('✅ MySQL接続成功');

    // Drizzleインスタンスの作成
    const db = drizzle(connection);
    console.log('✅ Drizzleインスタンス作成成功');

    // テストクエリ: 12月のシフトを取得
    const decemberShifts = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.year, 2025),
        eq(shifts.month, 12)
      ));

    console.log(`\n📅 2025年12月のシフト: ${decemberShifts.length}件`);

    for (const shift of decemberShifts) {
      console.log(`  ID: ${shift.id} - ${shift.name} (${shift.status})`);

      // シフト詳細の件数を確認
      const details = await db
        .select()
        .from(shiftDetails)
        .where(eq(shiftDetails.shiftId, shift.id));

      console.log(`    詳細: ${details.length}件`);

      // 埋まり率を計算
      const expectedSlots = 20 * 31; // 620枠
      const fillRate = (details.length / expectedSlots) * 100;
      console.log(`    埋まり率: ${fillRate.toFixed(1)}%`);
    }

    // 最新のルールベース生成シフトを特定
    const ruleBasedShift = decemberShifts
      .filter(s => s.generatedBy === 'rule_based')
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0];

    if (ruleBasedShift) {
      console.log('\n🎯 最新ルールベース生成シフト:');
      console.log(`  ID: ${ruleBasedShift.id} - ${ruleBasedShift.name}`);

      const details = await db
        .select()
        .from(shiftDetails)
        .where(eq(shiftDetails.shiftId, ruleBasedShift.id));

      const expectedSlots = 20 * 31;
      const fillRate = (details.length / expectedSlots) * 100;

      console.log(`  配置数: ${details.length}件`);
      console.log(`  埋まり率: ${fillRate.toFixed(1)}%`);

      if (fillRate >= 85) {
        console.log('  ✅ 目標達成（85%以上）');
      } else {
        console.log('  ⚠️ 目標未達（85%未満）');
      }

      // 生成方法別の内訳
      const byMethod: Record<string, number> = {};
      for (const detail of details) {
        const method = detail.generatedBy || 'manual';
        byMethod[method] = (byMethod[method] || 0) + 1;
      }

      console.log('\n  生成方法別:');
      Object.entries(byMethod).forEach(([method, count]) => {
        console.log(`    ${method}: ${count}件`);
      });
    }

    await connection.end();
    console.log('\n✅ データベース接続テスト完了');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testConnection().catch(console.error);