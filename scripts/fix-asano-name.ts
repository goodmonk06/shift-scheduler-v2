import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log('Updating 淺野 to 浅野...');

  // employeesテーブルの名前を更新
  await connection.execute(
    "UPDATE employees SET name = '浅野 穂菜美' WHERE name = '淺野 穂菜美'"
  );

  console.log('Updated employees table');

  // shift_detailsテーブルも確認して更新
  const [shiftDetails] = await connection.execute(
    "SELECT id, employeeId FROM shift_details WHERE employeeId = (SELECT id FROM employees WHERE name = '浅野 穂菜美')"
  );

  console.log('Shift details for 浅野:', shiftDetails);

  // 確認
  const [result] = await connection.execute(
    "SELECT id, employeeId, name FROM employees WHERE name LIKE '%浅野%' OR name LIKE '%淺野%'"
  );

  console.log('Final check:', result);

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
