import 'dotenv/config';
import mysql from 'mysql2/promise';

async function listTables() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    console.log('📋 データベース内のテーブル一覧:\n');
    const [rows] = await connection.execute('SHOW TABLES');
    console.log(rows);
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await connection.end();
  }
}

listTables().catch(console.error);
