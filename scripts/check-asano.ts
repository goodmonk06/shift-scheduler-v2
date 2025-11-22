import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  const result = await connection.execute(
    "SELECT id, employeeId, name FROM employees WHERE name LIKE '%浅野%' OR name LIKE '%穂菜美%'"
  );

  console.log('Employees matching 浅野 or 穂菜美:');
  console.log(JSON.stringify(result[0], null, 2));

  // すべてのemployeesを取得
  const allEmployees = await connection.execute(
    "SELECT id, employeeId, name FROM employees ORDER BY id"
  );

  console.log('\nAll employees:');
  console.log(JSON.stringify(allEmployees[0], null, 2));

  await connection.end();
}

main();
