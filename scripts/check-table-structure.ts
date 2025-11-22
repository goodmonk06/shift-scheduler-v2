import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  const [columns] = await connection.query(
    'DESCRIBE shiftDetails'
  );

  console.log('=== shiftDetails テーブル構造 ===\n');
  console.table(columns);

  await connection.end();
}

main().catch(console.error);
