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
import { simpleLogin, simpleLogout, getSimpleAuthUser, employeeLoginLimiter } from "../simpleAuth";
import { adminLogin, adminLogout, getAdminAuthUser, adminLoginLimiter } from "../adminAuth";
import serverRouter from "../routes/server";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { NotificationWebSocketServer } from "../websocket";
import { monitoring } from "../monitoring";

// Initialize monitoring
monitoring.initializeSentry();
monitoring.startMetricsCollection(60000); // Collect metrics every minute
monitoring.startHealthChecks(30000); // Health check every 30 seconds

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  monitoring.trackEvent("unhandled_rejection", { reason: String(reason) });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught Exception:", error);
  monitoring.trackEvent("uncaught_exception", { error: error.message });
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

  // CORS middleware for development
  if (process.env.NODE_ENV === "development") {
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "http://localhost:3001");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

      // Handle preflight requests
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }

      next();
    });
  }

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
  
  // Simple auth routes for employees (with rate limiting on login)
  app.post("/api/simple-auth/login", employeeLoginLimiter, simpleLogin);
  app.post("/api/simple-auth/logout", simpleLogout);
  app.get("/api/simple-auth/me", getSimpleAuthUser);

  // Admin auth routes (with rate limiting on login)
  app.post("/api/admin-auth/login", adminLoginLimiter, adminLogin);
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

  // Debug logging (only when DEBUG=true in environment)
  const isDebugMode = process.env.DEBUG === 'true';
  if (isDebugMode) {
    console.log(`[DEBUG] Debug mode enabled`);
    console.log(`[DEBUG] All env vars:`, Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')));
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
  }

  // Initialize WebSocket server
  const wsServer = new NotificationWebSocketServer(server);
  console.log("[WebSocket] Notification WebSocket server initialized");

  // Export WebSocket server instance for use in other modules
  (global as any).wsServer = wsServer;

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
    console.log(`[Server] Listening on port ${port}, expecting Railway to connect`);
    console.log(`[WebSocket] WebSocket server is running on the same port`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (wsServer && typeof (wsServer as any).shutdown === 'function') {
      (wsServer as any).shutdown();
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer().catch(console.error);
