import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file
config();

async function main() {
  // Parse DATABASE_URL: mysql://user:password@host:port/database
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("DATABASE_URL:", dbUrl ? "Found" : "Not found");

  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

  if (!match) {
    throw new Error(`Invalid DATABASE_URL format. Found: ${dbUrl.substring(0, 20)}...`);
  }

  const [, user, password, host, port, database] = match;

  console.log("Connecting to database:", { host, port, database, user });

  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }, // Allow self-signed certificates for Aiven
  });

  const migrationSQL = fs.readFileSync(
    path.join(process.cwd(), "drizzle", "0010_harsh_the_call.sql"),
    "utf8"
  );

  const statements = migrationSQL
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Applying ${statements.length} SQL statements...`);

  for (const statement of statements) {
    try {
      await connection.query(statement);
      console.log("✓ Applied statement");
    } catch (error: any) {
      console.error("Error applying statement:", statement);
      console.error(error.message);
      throw error;
    }
  }

  await connection.end();
  console.log("✓ Migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
