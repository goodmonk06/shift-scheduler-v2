import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // テーブル一覧を取得
  const [tables] = await connection.query('SHOW TABLES');
  console.log('=== Tables ===');
  console.log(tables);
  console.log();

  // 必要人数設定に関連しそうなテーブルを探す
  const tableNames = (tables as any[]).map(t => Object.values(t)[0]);
  const requiredStaffTable = tableNames.find((name: any) =>
    name.toLowerCase().includes('required') ||
    name.toLowerCase().includes('staff') ||
    name.toLowerCase().includes('setting')
  );

  if (requiredStaffTable) {
    console.log(`=== ${requiredStaffTable} ===`);
    const [rows] = await connection.query(`SELECT * FROM ${requiredStaffTable} ORDER BY id`);
    console.log(rows);
  }

  await connection.end();
}

main().catch(console.error);
