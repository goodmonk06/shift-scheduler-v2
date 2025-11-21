import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  const db = await getDb();
  if (!db) {
    console.error("データベースに接続できません");
    process.exit(1);
  }

  const adminEmail = "admin@example.com";

  try {
    // 既存の管理者を確認
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail));

    if (existingAdmins.length > 0) {
      console.log(`✅ 管理者ユーザーは既に存在します: ${adminEmail}`);

      // roleをadminに更新
      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.email, adminEmail));

      console.log("✅ 管理者権限を更新しました");
    } else {
      // 新規作成
      await db.insert(users).values({
        name: "システム管理者",
        email: adminEmail,
        role: "admin",
        openId: adminEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ 管理者ユーザーを作成しました: ${adminEmail}`);
    }

    console.log("\n📌 ログイン情報:");
    console.log(`   メールアドレス: ${adminEmail}`);
    console.log("   パスワード: 不要（メールアドレスのみでログイン）");

  } catch (error) {
    console.error("エラー:", error);
    process.exit(1);
  }

  process.exit(0);
}

createAdminUser();