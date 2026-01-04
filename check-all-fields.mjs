import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // シフトID: 127 の全フィールドを確認
  const [columns] = await connection.query(
    `SHOW COLUMNS FROM shiftDetails`
  );

  console.log('shiftDetailsテーブルの全カラム:');
  console.log(JSON.stringify(columns, null, 2));

  // シフトID 127のサンプルデータを全カラム取得
  const [data] = await connection.query(
    `SELECT * FROM shiftDetails WHERE shiftId = 127 LIMIT 5`
  );

  console.log('\n\nシフトID 127のサンプルデータ（全フィールド、5件）:');
  console.log(JSON.stringify(data, null, 2));

} finally {
  await connection.end();
}
