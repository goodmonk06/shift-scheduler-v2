/**
 * leaveRequestsテーブルのleaveTypeに「夏」「冬」を追加するスクリプト
 */

import { getDb } from "../server/db";
import mysql from "mysql2/promise";

async function alterLeaveTypes() {
  console.log("=== leaveTypeに夏・冬を追加 ===\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  try {
    // DATABASE_URLから接続情報を取得
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not set");
    }

    // Remove ssl-mode parameter if present (not supported by mysql2)
    const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, '');

    // 直接SQLを実行
    const connection = await mysql.createConnection(connectionString);

    console.log("📝 現在のleaveType定義を確認中...");

    // カラム情報を取得
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM leaveRequests WHERE Field = 'leaveType'
    `);

    console.log("現在の定義:", columns);

    console.log("\n🔄 leaveTypeを更新中...");

    // ENUMを更新（休、有休、夏、冬）
    await connection.execute(`
      ALTER TABLE leaveRequests
      MODIFY COLUMN leaveType ENUM('休', '有休', '夏', '冬')
      NOT NULL DEFAULT '休'
    `);

    console.log("✅ leaveTypeが更新されました");

    // 確認
    const [newColumns] = await connection.execute(`
      SHOW COLUMNS FROM leaveRequests WHERE Field = 'leaveType'
    `);

    console.log("\n新しい定義:", newColumns);

    await connection.end();

  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

alterLeaveTypes().catch(console.error);