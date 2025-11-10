import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/client/src/main.tsx"`,
        `src="/client/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Vite builds to 'build' directory (from vite.config.ts: outDir: '../build')
  const distPath = path.resolve(process.cwd(), "build");

  console.log(`[Static] Serving static files from: ${distPath}`);
  console.log(`[Static] Directory exists: ${fs.existsSync(distPath)}`);

  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log(`[Static] Build directory contents:`, files.slice(0, 10));
  }

  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] WARNING: Build directory not found at ${distPath}. Client assets will not be served. Make sure 'vite build' was run successfully.`
    );
    // Continue anyway - don't crash the server
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res, next) => {
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`[Static] Trying to serve index.html from: ${indexPath}`);

    if (!fs.existsSync(indexPath)) {
      console.error(`[Static] ERROR: index.html not found at ${indexPath}`);
      console.error(`[Static] Current working directory: ${process.cwd()}`);
      console.error(`[Static] Build directory exists: ${fs.existsSync(distPath)}`);

      return res.status(500).json({
        error: "Build files not found",
        message: `index.html not found. Build directory: ${distPath}`,
        cwd: process.cwd(),
        buildExists: fs.existsSync(distPath)
      });
    }

    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`[Static] ERROR sending file:`, err);
        next(err);
      }
    });
  });
}
