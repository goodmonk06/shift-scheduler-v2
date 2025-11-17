import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { requiredStaffing } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  console.log("Verifying required staffing data...\n");

  // サンプル: 月曜日9時 (事務員1名必要)
  const monday9 = await db
    .select()
    .from(requiredStaffing)
    .where(and(eq(requiredStaffing.dayOfWeek, 1), eq(requiredStaffing.hour, 9)));

  console.log("月曜日 9時:");
  console.log(JSON.stringify(monday9[0], null, 2));
  console.log();

  // サンプル: 月曜日21時 (夜勤のみ)
  const monday21 = await db
    .select()
    .from(requiredStaffing)
    .where(
      and(eq(requiredStaffing.dayOfWeek, 1), eq(requiredStaffing.hour, 21))
    );

  console.log("月曜日 21時:");
  console.log(JSON.stringify(monday21[0], null, 2));
  console.log();

  // サンプル: 土曜日10時 (平日より少ない)
  const saturday10 = await db
    .select()
    .from(requiredStaffing)
    .where(
      and(eq(requiredStaffing.dayOfWeek, 6), eq(requiredStaffing.hour, 10))
    );

  console.log("土曜日 10時:");
  console.log(JSON.stringify(saturday10[0], null, 2));
  console.log();

  // 全体の統計
  const allRecords = await db.select().from(requiredStaffing);
  console.log(`\n総レコード数: ${allRecords.length}`);

  // 事務員が必要な時間帯をカウント
  const officeStaffRequired = allRecords.filter(
    (r: any) => r.staffingDetails?.officeStaffRequired === 1
  );
  console.log(`事務員が必要な時間帯: ${officeStaffRequired.length} 時間帯`);

  await connection.end();
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
