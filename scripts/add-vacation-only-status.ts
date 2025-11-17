/**
 * Migration: Add 'vacation_only' to shifts.status enum
 *
 * This adds the missing 'vacation_only' status to the shifts table enum.
 */

import mysql from 'mysql2/promise';

async function addVacationOnlyStatus() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    console.log('🔄 Adding vacation_only to shifts.status enum...\n');

    // Check current enum
    const [currentEnum] = await conn.query<any[]>(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'defaultdb'
        AND TABLE_NAME = 'shifts'
        AND COLUMN_NAME = 'status'
    `);

    console.log('📋 Current enum:', currentEnum[0]?.COLUMN_TYPE);

    // Add vacation_only to the beginning of the enum
    await conn.query(`
      ALTER TABLE shifts
      MODIFY COLUMN status
      ENUM('vacation_only', 'draft', 'ai_generated', 'tentative', 'tentative_revised', 'confirmed', 'actual', 'archived')
      NOT NULL
      DEFAULT 'vacation_only'
    `);

    console.log('✅ Successfully added vacation_only status');

    // Verify the change
    const [newEnum] = await conn.query<any[]>(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'defaultdb'
        AND TABLE_NAME = 'shifts'
        AND COLUMN_NAME = 'status'
    `);

    console.log('📋 New enum:', newEnum[0]?.COLUMN_TYPE);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

addVacationOnlyStatus().catch(console.error);
