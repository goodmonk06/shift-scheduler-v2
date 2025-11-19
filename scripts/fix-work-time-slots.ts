/**
 * 職場ルールに基づいて勤務時間枠を正しく設定するスクリプト
 *
 * 職場ルール「4. 基本的な勤務時間」より:
 * - 夜勤: 16時～翌日9時（必要人数: 1名）
 * - 早番: 6時～15時（必要人数: 2名）
 * - 日勤A: 8時～17時（必要人数: 3名）
 * - 日勤B: 9時～18時（必要人数: 3名）
 * - 遅番: 11時～20時（必要人数: 2名）
 */

import * as db from "../server/db";

const CORRECT_TIME_SLOTS = [
  {
    name: "夜勤",
    displayLabel: "夜",
    startTime: "16:00",
    endTime: "09:00",
    isNightShift: true,
    requiredStaff: 1,
  },
  {
    name: "早番",
    displayLabel: "早",
    startTime: "06:00",
    endTime: "15:00",
    isNightShift: false,
    requiredStaff: 2,
  },
  {
    name: "日勤A",
    displayLabel: "日A",
    startTime: "08:00",
    endTime: "17:00",
    isNightShift: false,
    requiredStaff: 3,
  },
  {
    name: "日勤B",
    displayLabel: "日B",
    startTime: "09:00",
    endTime: "18:00",
    isNightShift: false,
    requiredStaff: 3,
  },
  {
    name: "遅番",
    displayLabel: "遅",
    startTime: "11:00",
    endTime: "20:00",
    isNightShift: false,
    requiredStaff: 2,
  },
];

async function main() {
  console.log("=== 勤務時間枠の修正 ===\n");

  // 1. 既存のデータを確認
  console.log("【ステップ1】既存データの確認...");
  const existing = await db.getAllWorkTimeSlots();
  console.log(`既存の時間枠: ${existing.length}件\n`);

  if (existing.length > 0) {
    console.log("既存データ:");
    existing.forEach(ts => {
      console.log(`  ID ${ts.id}: ${ts.name} (${ts.startTime}〜${ts.endTime}) 夜勤=${ts.isNightShift} 必要=${ts.requiredStaff}名`);
    });
    console.log();
  }

  // 2. 既存データを全削除
  console.log("【ステップ2】既存データを削除...");
  const database = await db.getDb();
  if (!database) {
    throw new Error("Database connection not available");
  }

  await database.transaction(async (tx) => {
    // workTimeSlotsテーブルを全削除
    await tx.execute({ sql: "DELETE FROM workTimeSlots" });
    console.log("  ✓ 既存データを削除しました");
  });

  // 3. 正しいデータを登録
  console.log("\n【ステップ3】正しいデータを登録...");
  for (const slot of CORRECT_TIME_SLOTS) {
    await db.createWorkTimeSlot(slot);
    console.log(`  ✓ ${slot.name} (${slot.startTime}〜${slot.endTime}) - 必要${slot.requiredStaff}名`);
  }

  // 4. 登録結果を確認
  console.log("\n【ステップ4】登録結果の確認...");
  const updated = await db.getAllWorkTimeSlots();
  console.log(`登録完了: ${updated.length}件\n`);

  updated.forEach(ts => {
    console.log(`  ID ${ts.id}: ${ts.name} (${ts.startTime}〜${ts.endTime})`);
    console.log(`    表示ラベル: ${ts.displayLabel}`);
    console.log(`    夜勤: ${ts.isNightShift ? 'はい' : 'いいえ'}`);
    console.log(`    必要人数: ${ts.requiredStaff}名`);
    console.log();
  });

  console.log("✅ 勤務時間枠の修正が完了しました！");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
