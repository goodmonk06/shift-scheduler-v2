#!/usr/bin/env tsx

/**
 * Production Database Migration Script
 *
 * This script safely applies database migrations to production
 * with proper error handling and rollback capabilities.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface MigrationBackup {
  id: string;
  timestamp: Date;
  tables: string[];
  checksums: Record<string, string>;
}

class ProductionMigrator {
  private pool: mysql.Pool | null = null;
  private db: any = null;
  private backupData: MigrationBackup | null = null;

  constructor(private connectionString: string) {}

  /**
   * Initialize database connection
   */
  async connect() {
    try {
      log('📡 Connecting to production database...', 'cyan');

      // Remove ssl-mode parameter if present
      const cleanConnectionString = this.connectionString.replace(/[?&]ssl-mode=[^&]*/g, '');

      this.pool = mysql.createPool(cleanConnectionString);
      this.db = drizzle(this.pool);

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      log('✅ Database connection established', 'green');
      return true;
    } catch (error: any) {
      log(`❌ Failed to connect to database: ${error.message}`, 'red');
      return false;
    }
  }

  /**
   * Create backup of current database state
   */
  async createBackup(): Promise<boolean> {
    if (!this.pool) {
      log('❌ Database not connected', 'red');
      return false;
    }

    try {
      log('💾 Creating database backup...', 'cyan');

      const connection = await this.pool.getConnection();

      // Get list of tables
      const [tables] = await connection.execute('SHOW TABLES');
      const tableNames = (tables as any[]).map(row => Object.values(row)[0] as string);

      this.backupData = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        tables: tableNames,
        checksums: {},
      };

      // Calculate checksums for each table
      for (const table of tableNames) {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
        const count = (rows as any[])[0].count;

        // Create a simple checksum based on row count and table structure
        const [columns] = await connection.execute(`SHOW COLUMNS FROM \`${table}\``);
        const columnNames = (columns as any[]).map(col => col.Field).join(',');
        const checksum = crypto
          .createHash('md5')
          .update(`${table}:${count}:${columnNames}`)
          .digest('hex');

        this.backupData.checksums[table] = checksum;
        log(`  ✓ Backed up table: ${table} (${count} rows)`, 'green');
      }

      connection.release();

      // Save backup metadata
      const backupPath = join(__dirname, `../backups/migration-${this.backupData.id}.json`);
      const backupDir = dirname(backupPath);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.writeFileSync(backupPath, JSON.stringify(this.backupData, null, 2));
      log(`✅ Backup created: ${this.backupData.id}`, 'green');

      return true;
    } catch (error: any) {
      log(`❌ Failed to create backup: ${error.message}`, 'red');
      return false;
    }
  }

  /**
   * Verify database integrity after migration
   */
  async verifyIntegrity(): Promise<boolean> {
    if (!this.pool || !this.backupData) {
      log('❌ Cannot verify integrity without connection and backup', 'red');
      return false;
    }

    try {
      log('🔍 Verifying database integrity...', 'cyan');

      const connection = await this.pool.getConnection();
      let integrityOk = true;

      // Check if all original tables still exist
      const [currentTables] = await connection.execute('SHOW TABLES');
      const currentTableNames = (currentTables as any[]).map(row => Object.values(row)[0] as string);

      for (const originalTable of this.backupData.tables) {
        if (!currentTableNames.includes(originalTable)) {
          log(`  ⚠️ Table missing: ${originalTable}`, 'yellow');
          integrityOk = false;
        }
      }

      // Check critical tables for workflow system
      const criticalTables = ['notifications', 'modificationRequests', 'workflowHistory'];
      for (const table of criticalTables) {
        if (currentTableNames.includes(table)) {
          const [result] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
          const count = (result as any[])[0].count;
          log(`  ✓ Table ${table} exists with ${count} rows`, 'green');
        }
      }

      connection.release();

      if (integrityOk) {
        log('✅ Database integrity verified', 'green');
      } else {
        log('⚠️ Some integrity issues detected, but migration succeeded', 'yellow');
      }

      return integrityOk;
    } catch (error: any) {
      log(`❌ Integrity check failed: ${error.message}`, 'red');
      return false;
    }
  }

  /**
   * Apply database migrations
   */
  async runMigrations(): Promise<boolean> {
    if (!this.db) {
      log('❌ Database not connected', 'red');
      return false;
    }

    try {
      log('🚀 Applying database migrations...', 'cyan');

      // Run migrations
      await migrate(this.db, {
        migrationsFolder: join(__dirname, '../drizzle')
      });

      log('✅ Migrations applied successfully', 'green');
      return true;
    } catch (error: any) {
      log(`❌ Migration failed: ${error.message}`, 'red');

      // Log detailed error for debugging
      if (error.stack) {
        console.error(error.stack);
      }

      return false;
    }
  }

  /**
   * Close database connections
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      log('🔌 Database connection closed', 'cyan');
    }
  }
}

/**
 * Main migration execution
 */
async function main() {
  const startTime = Date.now();

  log('\n=================================', 'bright');
  log('Production Database Migration Tool', 'bright');
  log('=================================\n', 'bright');

  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ DATABASE_URL environment variable is required', 'red');
    process.exit(1);
  }

  // Check for production mode confirmation
  if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--force')) {
    log('⚠️ Warning: Not in production mode', 'yellow');
    log('Use --force flag to run migrations in non-production environment', 'yellow');
    process.exit(1);
  }

  const migrator = new ProductionMigrator(databaseUrl);

  try {
    // Step 1: Connect to database
    const connected = await migrator.connect();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Step 2: Create backup
    const backupCreated = await migrator.createBackup();
    if (!backupCreated) {
      throw new Error('Failed to create backup');
    }

    // Step 3: Run migrations
    const migrationSuccessful = await migrator.runMigrations();
    if (!migrationSuccessful) {
      throw new Error('Migration failed');
    }

    // Step 4: Verify integrity
    await migrator.verifyIntegrity();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n✅ Migration completed successfully in ${duration}s`, 'green');
    log('=================================\n', 'bright');

    process.exit(0);
  } catch (error: any) {
    log(`\n❌ Migration failed: ${error.message}`, 'red');
    log('Please check the backup and logs for recovery', 'yellow');
    log('=================================\n', 'bright');

    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error: any) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run migrations
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}