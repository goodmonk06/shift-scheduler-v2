/**
 * Apply migration 0017: Add 'rule_based' to generatedBy enums
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Applying Migration 0017');
  console.log('   Add rule_based to generatedBy enums');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const statements = [
    "ALTER TABLE `shifts` MODIFY COLUMN `generatedBy` ENUM('manual', 'ai', 'rule_based') NOT NULL DEFAULT 'manual'",
    "ALTER TABLE `shiftDetails` MODIFY COLUMN `generatedBy` ENUM('manual', 'ai', 'leave_request', 'rule_based') NOT NULL DEFAULT 'manual'"
  ];

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    console.log(`[${i + 1}/${statements.length}] Executing:`);
    console.log(`  ${statements[i].substring(0, 80)}...`);

    try {
      await db.execute(statements[i] as any);
      console.log('  ✅ Success\n');
    } catch (error: any) {
      console.error('  ❌ Failed:', error.message);
      throw error;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Migration 0017 applied successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

applyMigration().catch(console.error);
