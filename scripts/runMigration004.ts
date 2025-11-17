/**
 * Migration runner for workflow tables
 * Run: DATABASE_URL='your-connection-string' pnpm tsx scripts/runMigration004.ts
 */

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runMigration() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true // Allow multiple SQL statements
  });

  try {
    console.log('🔄 Starting migration 004: Add workflow tables...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../drizzle/migrations/0004_add_workflow_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await connection.query(migrationSQL);

    console.log('✅ Migration 004 completed successfully!');
    console.log('📋 Added tables:');
    console.log('   - notifications');
    console.log('   - modificationRequests');
    console.log('   - workflowHistory');
    console.log('📋 Added columns:');
    console.log('   - employees: notificationEnabled, notificationEmail, lineUserId');
    console.log('   - shifts: feedbackDeadline, notificationsSent');

    // Verify the new tables exist
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('notifications', 'modificationRequests', 'workflowHistory')
    `);

    console.log('\n🔍 Verification:');
    console.log(`   Tables created: ${(tables as any[]).length}/3`);
    (tables as any[]).forEach((table: any) => {
      console.log(`   ✓ ${table.TABLE_NAME}`);
    });

    // Check if columns were added
    const [employeeCols] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'employees'
        AND COLUMN_NAME IN ('notificationEnabled', 'notificationEmail', 'lineUserId')
    `);

    const [shiftCols] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'shifts'
        AND COLUMN_NAME IN ('feedbackDeadline', 'notificationsSent')
    `);

    console.log(`\n   Columns added to employees: ${(employeeCols as any[]).length}/3`);
    console.log(`   Columns added to shifts: ${(shiftCols as any[]).length}/2`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 If columns already exist, you may need to:');
    console.error('   1. Check if the migration was already partially applied');
    console.error('   2. Manually remove existing columns/tables if needed');
    console.error('   3. Re-run the migration');
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the migration
runMigration().catch(console.error);