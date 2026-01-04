import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 最新のシフトから10件のshiftDetailsを取得してgeneratedByとisFixedを確認
  const [rows] = await connection.query(
    'SELECT id, date, employeeId, generatedBy, isFixed FROM shiftDetails WHERE shiftId = (SELECT id FROM shifts ORDER BY createdAt DESC LIMIT 1) LIMIT 10'
  );

  console.log('最新シフトの詳細データ（10件）:');
  console.log(JSON.stringify(rows, null, 2));

  // generatedByの分布を確認
  const [distribution] = await connection.query(
    `SELECT generatedBy, COUNT(*) as count
     FROM shiftDetails
     WHERE shiftId = (SELECT id FROM shifts ORDER BY createdAt DESC LIMIT 1)
     GROUP BY generatedBy`
  );

  console.log('\ngeneratedByの分布:');
  console.log(JSON.stringify(distribution, null, 2));

  // isFixedの値を確認
  const [isFixedCheck] = await connection.query(
    `SELECT isFixed, COUNT(*) as count
     FROM shiftDetails
     WHERE shiftId = (SELECT id FROM shifts ORDER BY createdAt DESC LIMIT 1)
     GROUP BY isFixed`
  );

  console.log('\nisFixedの分布:');
  console.log(JSON.stringify(isFixedCheck, null, 2));

} finally {
  await connection.end();
}
