import { generateShiftTimeSlotBased } from "../server/timeSlotBasedGeneratorApi";
import { generateShiftRuleBased } from "../server/ruleBasedShiftGeneratorApi";
import { getDb } from "../server/db";
import { shiftDetails } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function performanceTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚡ パフォーマンステスト");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const shiftId = 8;
  const year = 2024;
  const month = 12;

  const db = await getDb();
  if (!db) {
    console.error("データベース接続失敗");
    return;
  }

  // 1. 時間スロットベース生成のテスト
  console.log("1️⃣ 時間スロットベース生成");

  // 既存データをクリア
  await db.delete(shiftDetails)
    .where(
      and(
        eq(shiftDetails.shiftId, shiftId),
        eq(shiftDetails.generatedBy, 'rule_based')
      )
    );

  const startTime1 = process.hrtime.bigint();
  const result1 = await generateShiftTimeSlotBased({ shiftId, year, month });
  const endTime1 = process.hrtime.bigint();

  const duration1 = Number(endTime1 - startTime1) / 1_000_000; // ミリ秒に変換

  console.log(`  実行時間: ${duration1.toFixed(2)}ms`);
  console.log(`  生成数: ${result1.assignmentsCreated}件`);
  console.log(`  成功: ${result1.success}`);
  if (result1.assignmentsCreated > 0) {
    console.log(`  1件あたり: ${(duration1 / result1.assignmentsCreated).toFixed(3)}ms`);
  }

  // 2. 既存ルールベース生成のテスト
  console.log("\n2️⃣ 既存ルールベース生成");

  // 既存データをクリア
  await db.delete(shiftDetails)
    .where(
      and(
        eq(shiftDetails.shiftId, shiftId),
        eq(shiftDetails.generatedBy, 'rule_based')
      )
    );

  const startTime2 = process.hrtime.bigint();

  try {
    await generateShiftRuleBased({ shiftId, year, month });
    const endTime2 = process.hrtime.bigint();
    const duration2 = Number(endTime2 - startTime2) / 1_000_000;

    // 生成数を確認
    const generatedDetails = await db.select().from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.generatedBy, 'rule_based')
        )
      );

    console.log(`  実行時間: ${duration2.toFixed(2)}ms`);
    console.log(`  生成数: ${generatedDetails.length}件`);
    console.log(`  成功: true`);
    if (generatedDetails.length > 0) {
      console.log(`  1件あたり: ${(duration2 / generatedDetails.length).toFixed(3)}ms`);
    }

    // 3. 比較
    console.log("\n3️⃣ パフォーマンス比較");
    const speedup = duration2 / duration1;
    console.log(`  時間スロットベース: ${duration1.toFixed(2)}ms`);
    console.log(`  既存ルールベース: ${duration2.toFixed(2)}ms`);

    if (speedup > 1) {
      console.log(`  📈 時間スロットベースの方が ${speedup.toFixed(2)}倍 高速`);
    } else {
      console.log(`  📉 既存ルールベースの方が ${(1/speedup).toFixed(2)}倍 高速`);
    }

  } catch (error: any) {
    console.log(`  エラー: ${error.message}`);
  }

  // 4. メモリ使用量
  console.log("\n4️⃣ メモリ使用量");
  const memUsage = process.memoryUsage();
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

  // 5. データベース統計
  console.log("\n5️⃣ データベース統計");
  const allDetails = await db.select().from(shiftDetails)
    .where(eq(shiftDetails.shiftId, shiftId));

  const byGenerator: Record<string, number> = {};
  allDetails.forEach(detail => {
    const gen = detail.generatedBy || "manual";
    byGenerator[gen] = (byGenerator[gen] || 0) + 1;
  });

  console.log(`  総レコード数: ${allDetails.length}`);
  for (const [gen, count] of Object.entries(byGenerator)) {
    console.log(`    ${gen}: ${count}件`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ パフォーマンステスト完了");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  process.exit(0);
}

performanceTest().catch(console.error);