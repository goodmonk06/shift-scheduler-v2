/**
 * 休憩時間ルールのマイグレーションスクリプト
 * 12月システム（DecemberShiftGeneration.tsx）のハードコードデータをDBに投入
 *
 * 実行方法:
 * pnpm tsx scripts/migrate-break-time-rules.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { employees, type BreakTimeRule } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// 12月システムのハードコードデータをマッピング
const BREAK_TIME_MAPPING: Record<number, BreakTimeRule> = {
  // 固定60分（10名）
  1: { type: "fixed", duration: 1 },           // 髙野幹成
  2: { type: "fixed", duration: 1 },           // 山口夕香里
  3: { type: "fixed", duration: 1 },           // 馬渕尊至
  4: { type: "fixed", duration: 1 },           // 杉山美佳子
  5: { type: "fixed", duration: 1 },           // 梅田英津子
  6: { type: "fixed", duration: 1 },           // 松嵜愛梨
  7: { type: "fixed", duration: 1 },           // 大橋健一

  // 6時間以上で60分（12名）
  8: { type: "conditional", threshold: 6, conditionDuration: 1 },  // 上条やえ子
  9: { type: "conditional", threshold: 6, conditionDuration: 1 },  // 若森直子
  10: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 足立洋子
  13: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 加藤広大
  15: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 湯本智子
  16: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 楠美佐
  18: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 山田明美
  19: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 足立豊子
  20: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 関田あゆみ
  24: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 大堀シェリー
  26: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 岩崎亜友美
  27: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 淺野穂菜美

  // 6時間以上で30分（1名）
  17: { type: "conditional", threshold: 6, conditionDuration: 0.5 }, // 平井英子

  // 5時間以上で30分（1名）
  14: { type: "conditional", threshold: 5, conditionDuration: 0.5 }, // 海野はるか

  // 休憩なし（6名）
  11: { type: "none" }, // 野仲彩香
  12: { type: "none" }, // 桂川美幸
  21: { type: "none" }, // 長山真梨奈
  22: { type: "none" }, // 伊藤美穂
  23: { type: "none" }, // 近藤由美子
  25: { type: "none" }, // 宝本龍騎
};

async function migrateBreakTimeRules() {
  console.log('=== 休憩時間ルールのマイグレーション開始 ===\n');

  // データベース接続
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });

  const db = drizzle(connection);

  let successCount = 0;
  let errorCount = 0;

  for (const [employeeIdStr, rule] of Object.entries(BREAK_TIME_MAPPING)) {
    const employeeId = Number(employeeIdStr);

    try {
      // 職員が存在するか確認
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);

      if (!employee) {
        console.log(`⚠️  職員ID ${employeeId}: 職員が見つかりません（スキップ）`);
        continue;
      }

      // 休憩時間ルールを更新
      await db
        .update(employees)
        .set({ breakTimeRule: rule as any })
        .where(eq(employees.id, employeeId));

      // ルール内容を表示
      let ruleDesc = '';
      if (rule.type === 'fixed') {
        ruleDesc = `固定${rule.duration! * 60}分`;
      } else if (rule.type === 'conditional') {
        ruleDesc = `${rule.threshold}時間以上で${rule.conditionDuration! * 60}分`;
      } else {
        ruleDesc = '休憩なし';
      }

      console.log(`✅ 職員ID ${employeeId} (${employee.name}): ${ruleDesc}`);
      successCount++;
    } catch (error) {
      console.error(`❌ 職員ID ${employeeId} の更新失敗:`, error);
      errorCount++;
    }
  }

  await connection.end();

  console.log('\n=== マイグレーション完了 ===');
  console.log(`成功: ${successCount}件 / 失敗: ${errorCount}件 / 合計: ${Object.keys(BREAK_TIME_MAPPING).length}件`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// 実行
migrateBreakTimeRules()
  .then(() => {
    console.log('\n✅ マイグレーションが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ マイグレーションエラー:', error);
    process.exit(1);
  });
