import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function addColumns() {
  const connection = await mysql.createConnection(connectionString);

  try {
    console.log('Adding customEvents column...');
    await connection.execute(`
      ALTER TABLE shifts
      ADD COLUMN customEvents JSON COMMENT '行事予定（日付→イベント名）'
    `);
    console.log('✓ customEvents column added');

    console.log('Adding inspectionMeals column...');
    await connection.execute(`
      ALTER TABLE shifts
      ADD COLUMN inspectionMeals JSON COMMENT '検食（日付→担当者名）'
    `);
    console.log('✓ inspectionMeals column added');

    console.log('Migration completed successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist, skipping...');
    } else {
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addColumns().catch(console.error);
