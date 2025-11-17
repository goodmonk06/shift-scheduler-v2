import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as readline from "readline";

/**
 * 管理者アカウントのセットアップスクリプト
 * 対話形式で管理者情報を入力して、usersテーブルにadminロールのユーザーを作成
 */

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  console.log("🔐 Admin Account Setup");
  console.log("======================\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // 管理者情報の入力
  const adminEmail = await question("管理者のメールアドレス (例: admin@example.com): ");
  const adminName = await question("管理者の名前 (例: 管理者): ");

  if (!adminEmail || !adminName) {
    console.log("❌ メールアドレスと名前は必須です");
    process.exit(1);
  }

  // 既存の管理者をチェック
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log(`\n⚠️  このメールアドレスは既に登録されています: ${adminEmail}`);
    console.log(`   ロール: ${existingAdmin[0].role}`);
    console.log(`   名前: ${existingAdmin[0].name}`);

    if (existingAdmin[0].role === "admin") {
      console.log("\n✅ 既に管理者アカウントが存在します");
      process.exit(0);
    } else {
      console.log("\n❌ このアカウントは職員ロールです。別のメールアドレスを使用してください");
      process.exit(1);
    }
  }

  // 管理者ユーザーを作成
  const openId = `admin-${Date.now()}`; // ユニークなopenIdを生成
  await db.insert(schema.users).values({
    openId,
    name: adminName,
    email: adminEmail,
    role: "admin",
    loginMethod: "passwordless",
  });

  console.log("\n✅ 管理者アカウントを作成しました！");
  console.log(`   メール: ${adminEmail}`);
  console.log(`   名前: ${adminName}`);
  console.log(`   ロール: admin`);
  console.log("\n📝 Next steps:");
  console.log("  1. ログイン画面で「管理者としてログイン」を選択");
  console.log(`  2. メールアドレス「${adminEmail}」でログイン`);
  console.log("  3. 管理画面で以下のマスタデータを設定:");
  console.log("     - 役職グループ（正社員、パートなど）");
  console.log("     - 勤務時間枠（早番、遅番、夜勤など）");
  console.log("     - 職員情報");
  console.log("     - 職場ルール");
  console.log("     - 必要人数設定");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ エラーが発生しました:", err);
  process.exit(1);
});
