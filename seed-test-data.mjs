import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function seedTestData() {
  console.log("=== テストデータ作成開始 ===\n");
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // 1. 役職グループ作成
    console.log("1. 役職グループ作成中...");
    await connection.query(`
      INSERT INTO positionGroups (name, employmentType, displayOrder) VALUES
      ('正社員', 'fulltime', 1),
      ('パート', 'parttime', 2)
    `);
    console.log("✓ 役職グループ作成完了");
    
    // 2. 勤務時間枠作成
    console.log("\n2. 勤務時間枠作成中...");
    await connection.query(`
      INSERT INTO workTimeSlots (name, displayLabel, startTime, endTime, isNightShift) VALUES
      ('早番', '早', '07:00', '16:00', 0),
      ('遅番', '遅', '11:00', '20:00', 0),
      ('夜勤', '夜', '16:00', '09:00', 1),
      ('日勤', '日', '09:00', '18:00', 0)
    `);
    console.log("✓ 勤務時間枠作成完了");
    
    // 3. 職員データ作成
    console.log("\n3. 職員データ作成中...");
    await connection.query(`
      INSERT INTO employees (name, positionGroupId, displayOrder) VALUES
      ('田中太郎', 1, 1),
      ('佐藤花子', 1, 2),
      ('鈴木一郎', 1, 3),
      ('山田美咲', 2, 4),
      ('高橋健太', 2, 5),
      ('渡辺由美', 2, 6)
    `);
    console.log("✓ 職員データ作成完了");
    
    // 4. 必要人数設定（平日昼間: 3人、夜間: 2人）
    console.log("\n4. 必要人数設定中...");
    const staffingData = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const required = (hour >= 9 && hour < 18) ? 3 : 2;
        staffingData.push(`(${day}, ${hour}, ${required})`);
      }
    }
    await connection.query(`
      INSERT INTO requiredStaffing (dayOfWeek, hour, requiredCount) VALUES
      ${staffingData.join(', ')}
    `);
    console.log("✓ 必要人数設定完了");
    
    // 確認
    console.log("\n=== 作成データ確認 ===");
    const posGroups = await connection.query("SELECT * FROM positionGroups");
    console.log(`役職グループ: ${posGroups[0].length}件`);
    
    const timeSlots = await connection.query("SELECT * FROM workTimeSlots");
    console.log(`勤務時間枠: ${timeSlots[0].length}件`);
    
    const emps = await connection.query("SELECT * FROM employees");
    console.log(`職員: ${emps[0].length}件`);
    
    const staffing = await connection.query("SELECT * FROM requiredStaffing");
    console.log(`必要人数設定: ${staffing[0].length}件`);
    
    console.log("\n=== テストデータ作成完了 ===");
    
  } catch (error) {
    console.error("エラー:", error.message);
  } finally {
    await connection.end();
  }
}

seedTestData();
