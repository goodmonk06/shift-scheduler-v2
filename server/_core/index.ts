import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { simpleLogin, simpleLogout, getSimpleAuthUser } from "../simpleAuth";
import { adminLogin, adminLogout, getAdminAuthUser } from "../adminAuth";
import serverRouter from "../routes/server";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught Exception:", error);
  process.exit(1);
});

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Migration] DATABASE_URL not found, skipping migrations");
    return;
  }

  try {
    console.log("[Migration] Starting database migrations...");

    // Remove ssl-mode parameter if present (not supported by mysql2)
    const connectionString = process.env.DATABASE_URL.replace(/[?&]ssl-mode=[^&]*/g, '');

    // Create connection pool
    const poolConnection = mysql.createPool(connectionString);
    const db = drizzle(poolConnection);

    // Run migrations from drizzle folder
    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("[Migration] ✓ All migrations applied successfully");

    // Close the pool
    await poolConnection.end();
  } catch (error: any) {
    // If tables already exist, just log a warning and continue
    if (error?.cause?.code === 'ER_TABLE_EXISTS_ERROR' ||
        error?.message?.includes('already exists')) {
      console.warn("[Migration] ⚠ Some tables already exist, skipping migration");
      console.warn("[Migration] This is expected if database was previously migrated");
      return;
    }

    console.error("[Migration] Failed to run migrations:", error);
    throw error;
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Run database migrations first
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Cookie parser for simple auth
  app.use(cookieParser());
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Simple auth routes for employees
  app.post("/api/simple-auth/login", simpleLogin);
  app.post("/api/simple-auth/logout", simpleLogout);
  app.get("/api/simple-auth/me", getSimpleAuthUser);

  // Admin auth routes
  app.post("/api/admin-auth/login", adminLogin);
  app.post("/api/admin-auth/logout", adminLogout);
  app.get("/api/admin-auth/me", getAdminAuthUser);

  // Server management routes
  app.use("/api/server", serverRouter);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handler - must be after all routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[ERROR]", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  });

  const port = parseInt(process.env.PORT || "3000");
  const host = "0.0.0.0"; // Listen on all network interfaces for Railway

  console.log(`[ENV] PORT=${process.env.PORT}`);
  console.log(`[ENV] NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`[ENV] All env vars:`, Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')));

  // Debug: Log directory structure to diagnose build output location
  console.log(`[DEBUG] process.cwd() = ${process.cwd()}`);
  console.log(`[DEBUG] __dirname would be = ${import.meta.dirname}`);
  try {
    const fs = await import('fs');
    const cwdContents = fs.readdirSync(process.cwd());
    console.log(`[DEBUG] Contents of cwd:`, cwdContents);

    // Check if build or dist directories exist
    ['build', 'dist', 'client'].forEach(dir => {
      const dirPath = `${process.cwd()}/${dir}`;
      if (fs.existsSync(dirPath)) {
        const contents = fs.readdirSync(dirPath).slice(0, 10);
        console.log(`[DEBUG] Contents of ${dir}/:`, contents);
      } else {
        console.log(`[DEBUG] ${dir}/ does not exist`);
      }
    });
  } catch (e) {
    console.error(`[DEBUG] Error reading directory:`, e);
  }

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
    console.log(`[Server] Listening on port ${port}, expecting Railway to connect`);
  });
}

startServer().catch(console.error);
