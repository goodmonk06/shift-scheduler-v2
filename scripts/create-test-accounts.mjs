import { drizzle } from "drizzle-orm/mysql2";
import { users, employees } from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

async function createTestAccounts() {
  console.log("テストアカウントを作成します...");

  try {
    // 管理者アカウント（既存のオーナーアカウントを使用）
    console.log("\n管理者アカウント:");
    console.log("- メールアドレス: kinyu000@gmail.com");
    console.log("- 役割: admin");
    console.log("- ログインURL: プレビューURLにアクセスしてManus OAuthでログイン");

    // 職員用テストアカウント1（ID: 00001に対応）
    const testEmployee1OpenId = "test-employee-00001";
    const existingUser1 = await db.select().from(users).where(eq(users.openId, testEmployee1OpenId)).limit(1);
    
    if (existingUser1.length === 0) {
      await db.insert(users).values({
        openId: testEmployee1OpenId,
        name: "テスト職員01",
        email: "test-employee-01@example.com",
        role: "user",
        loginMethod: "test",
      });
      console.log("\n✓ 職員用テストアカウント1を作成しました");
    } else {
      console.log("\n- 職員用テストアカウント1は既に存在します");
    }

    // 職員用テストアカウント2
    const testEmployee2OpenId = "test-employee-00002";
    const existingUser2 = await db.select().from(users).where(eq(users.openId, testEmployee2OpenId)).limit(1);
    
    if (existingUser2.length === 0) {
      await db.insert(users).values({
        openId: testEmployee2OpenId,
        name: "テスト職員02",
        email: "test-employee-02@example.com",
        role: "user",
        loginMethod: "test",
      });
      console.log("✓ 職員用テストアカウント2を作成しました");
    } else {
      console.log("- 職員用テストアカウント2は既に存在します");
    }

    // 既存の職員データとユーザーアカウントを紐付け
    const user1Result = await db.select().from(users).where(eq(users.openId, testEmployee1OpenId)).limit(1);
    const user2Result = await db.select().from(users).where(eq(users.openId, testEmployee2OpenId)).limit(1);
    const employeeList = await db.select().from(employees).limit(2);

    if (user1Result.length > 0 && employeeList.length > 0) {
      await db.update(employees)
        .set({ userId: user1Result[0].id })
        .where(eq(employees.id, employeeList[0].id));
      console.log(`✓ 職員「${employeeList[0].name}」にユーザーアカウントを紐付けました`);
    }

    if (user2Result.length > 0 && employeeList.length > 1) {
      await db.update(employees)
        .set({ userId: user2Result[0].id })
        .where(eq(employees.id, employeeList[1].id));
      console.log(`✓ 職員「${employeeList[1].name}」にユーザーアカウントを紐付けました`);
    }

    console.log("\n=== テストアカウント情報 ===");
    console.log("\n【管理者アカウント】");
    console.log("メールアドレス: kinyu000@gmail.com");
    console.log("役割: 管理者");
    console.log("アクセス方法: プレビューURLにアクセスしてManus OAuthでログイン");
    
    console.log("\n【職員アカウント1】");
    console.log("OpenID: test-employee-00001");
    console.log("メールアドレス: test-employee-01@example.com");
    console.log("役割: 職員");
    console.log("※ 現在のManus OAuth認証では、職員専用ログインは未対応です");
    console.log("※ 職員画面は /employee パスでアクセスできます");

    console.log("\n【職員アカウント2】");
    console.log("OpenID: test-employee-00002");
    console.log("メールアドレス: test-employee-02@example.com");
    console.log("役割: 職員");

    console.log("\n=== 使い方 ===");
    console.log("1. 管理者としてログイン: プレビューURLにアクセス");
    console.log("2. 職員画面を確認: /employee にアクセス");
    console.log("3. 希望休申請: 職員画面から「希望休申請」をクリック");
    console.log("4. 管理者側で承認: 「希望休管理」から承認・却下");

  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }

  process.exit(0);
}

createTestAccounts();
