import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log('Reverting 浅野 to 淺野...');

  // employeesテーブルの名前を元に戻す
  const [result] = await connection.execute(
    "UPDATE employees SET name = '淺野 穂菜美' WHERE name = '浅野 穂菜美'"
  );

  console.log('Update result:', result);

  // 確認
  const [check] = await connection.execute(
    "SELECT id, employeeId, name FROM employees WHERE name LIKE '%野 穂菜美%'"
  );

  console.log('Final check:', check);

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
