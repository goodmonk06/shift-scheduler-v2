import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function testBasicFunctions() {
  console.log("=== シフト管理システム 基本機能テスト ===\n");
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // 1. データベース接続テスト
    console.log("✓ データベース接続: 成功");
    
    // 2. テーブル存在確認
    const tables = await connection.query("SHOW TABLES");
    const tableNames = tables[0].map(t => Object.values(t)[0]);
    const requiredTables = [
      'users', 'positionGroups', 'employees', 'workTimeSlots',
      'employeeConstraints', 'workplaceRules', 'requiredStaffing',
      'shifts', 'shiftDetails', 'leaveRequests', 'changeProposals',
      'emergencyNotifications', 'shiftFeedback'
    ];
    
    console.log("\n=== テーブル存在確認 ===");
    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`${exists ? '✓' : '✗'} ${table}: ${exists ? '存在' : '不在'}`);
    });
    
    // 3. 各テーブルのレコード数確認
    console.log("\n=== テーブルレコード数 ===");
    for (const table of requiredTables) {
      const result = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result[0][0].count;
      console.log(`${table}: ${count}件`);
    }
    
    console.log("\n=== テスト完了 ===");
    
  } catch (error) {
    console.error("エラー:", error.message);
  } finally {
    await connection.end();
  }
}

testBasicFunctions();
