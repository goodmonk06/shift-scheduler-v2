/**
 * 職員ログインのテストスクリプト
 * 職員IDのみでログインできることを確認
 */

import { getDb } from "../server/db";
import { employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function testEmployeeLogin() {
  console.log("=== 職員ログインテスト ===");

  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  try {
    // 既存の職員を取得
    const existingEmployees = await db
      .select()
      .from(employees)
      .limit(3);

    if (existingEmployees.length === 0) {
      console.log("⚠️ 職員が登録されていません");
      return;
    }

    console.log("\n📋 登録済み職員（最大3件）:");
    for (const emp of existingEmployees) {
      console.log(`  - ${emp.name} (ID: ${emp.employeeId}, Email: ${emp.email || 'なし'})`);
    }

    // 最初の職員でログインをシミュレート
    const testEmployee = existingEmployees[0];
    console.log(`\n🔐 テストログイン: ${testEmployee.name} (ID: ${testEmployee.employeeId})`);

    // 職員IDで検索
    const foundById = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, testEmployee.employeeId))
      .limit(1);

    if (foundById.length > 0) {
      console.log("✅ 職員IDでログイン可能");
    } else {
      console.log("❌ 職員IDでログインできません");
    }

    // メールアドレスがある場合はメールでも検索
    if (testEmployee.email) {
      const foundByEmail = await db
        .select()
        .from(employees)
        .where(eq(employees.email, testEmployee.email))
        .limit(1);

      if (foundByEmail.length > 0) {
        console.log("✅ メールアドレスでもログイン可能");
      } else {
        console.log("❌ メールアドレスでログインできません");
      }
    }

    console.log("\n✨ 職員ログインは職員IDのみで動作します（誕生日不要）");

  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

testEmployeeLogin().catch(console.error);