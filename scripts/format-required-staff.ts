import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows] = await connection.query(
    'SELECT * FROM requiredStaffing ORDER BY dayOfWeek, hour'
  );

  const data = rows as any[];

  // 曜日名
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  // 曜日ごとにグループ化
  for (let day = 0; day <= 6; day++) {
    console.log(`\n=== ${dayNames[day]}曜日 ===`);
    const dayData = data.filter(r => r.dayOfWeek === day);

    for (const row of dayData) {
      console.log(`${String(row.hour).padStart(2, '0')}:00 → ${row.requiredCount}名`);
    }
  }

  await connection.end();
}

main().catch(console.error);
