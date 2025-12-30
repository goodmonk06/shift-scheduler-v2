import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function checkEmployees() {
  const connection = await mysql.createConnection(connectionString);

  try {
    const [employees] = await connection.execute(
      'SELECT id, employeeId, name, isArchived FROM employees WHERE name IN (?, ?)',
      ['伊藤 美穂', '近藤 由美子']
    );

    console.log('現在の状態:');
    if (employees.length === 0) {
      console.log('  該当する職員が見つかりませんでした');
    } else {
      employees.forEach(emp => {
        console.log(`  ID: ${emp.id}, 職員ID: ${emp.employeeId}, 名前: ${emp.name}, アーカイブ済み: ${emp.isArchived ? 'はい' : 'いいえ'}`);
      });
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

checkEmployees().catch(console.error);
