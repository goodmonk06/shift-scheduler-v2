import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function checkTable() {
  const connection = await mysql.createConnection(connectionString);

  try {
    const [columns] = await connection.execute('SHOW COLUMNS FROM shifts');
    console.log('shiftsテーブルのカラム:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    // customEventsとinspectionMealsの存在確認
    const hasCustomEvents = columns.some(col => col.Field === 'customEvents');
    const hasInspectionMeals = columns.some(col => col.Field === 'inspectionMeals');

    console.log('\n確認結果:');
    console.log(`  customEvents: ${hasCustomEvents ? '存在する' : '存在しない'}`);
    console.log(`  inspectionMeals: ${hasInspectionMeals ? '存在する' : '存在しない'}`);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

checkTable().catch(console.error);
