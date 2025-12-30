import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function checkTable() {
  const connection = await mysql.createConnection(connectionString);

  try {
    const [columns] = await connection.execute('SHOW COLUMNS FROM employees');
    console.log('employeesテーブルのカラム:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL可)' : '(NOT NULL)'} ${col.Default !== null ? `デフォルト: ${col.Default}` : ''}`);
    });
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

checkTable().catch(console.error);
