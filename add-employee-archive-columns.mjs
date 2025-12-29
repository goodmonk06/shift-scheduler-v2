import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function addColumns() {
  const connection = await mysql.createConnection(connectionString);

  try {
    console.log('Adding isArchived column...');
    await connection.execute(`
      ALTER TABLE employees
      ADD COLUMN isArchived BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'アーカイブ済みフラグ（論理削除）'
    `);
    console.log('✓ isArchived column added');

    console.log('Adding archivedAt column...');
    await connection.execute(`
      ALTER TABLE employees
      ADD COLUMN archivedAt TIMESTAMP NULL COMMENT 'アーカイブ日時'
    `);
    console.log('✓ archivedAt column added');

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
