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
  // Try multiple possible build locations
  const possiblePaths = [
    path.resolve(process.cwd(), "build"),
    path.resolve(process.cwd(), "dist"),
    path.resolve(process.cwd(), "client", "build"),
    path.resolve(import.meta.dirname, "../../build"),
  ];

  console.log(`[Static] Searching for build directory...`);
  console.log(`[Static] Current working directory: ${process.cwd()}`);
  console.log(`[Static] import.meta.dirname: ${import.meta.dirname}`);

  let distPath: string | null = null;
  for (const testPath of possiblePaths) {
    console.log(`[Static] Checking: ${testPath} - exists: ${fs.existsSync(testPath)}`);
    if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, "index.html"))) {
      distPath = testPath;
      console.log(`[Static] ✓ Found build directory at: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    console.error(`[Static] ERROR: Build directory not found in any of the expected locations`);
    console.error(`[Static] Searched paths:`, possiblePaths);

    // List what actually exists in cwd
    try {
      const cwdContents = fs.readdirSync(process.cwd());
      console.error(`[Static] Contents of ${process.cwd()}:`, cwdContents);
    } catch (e) {
      console.error(`[Static] Could not read cwd:`, e);
    }

    distPath = possiblePaths[0]; // fallback to first path for error reporting
  } else {
    const files = fs.readdirSync(distPath);
    console.log(`[Static] Build directory contents (first 10):`, files.slice(0, 10));
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res, next) => {
    const indexPath = path.resolve(distPath!, "index.html");

    if (!fs.existsSync(indexPath)) {
      console.error(`[Static] ERROR: index.html not found at ${indexPath}`);

      return res.status(500).json({
        error: "Build files not found",
        message: `index.html not found. Build directory: ${distPath}`,
        cwd: process.cwd(),
        searchedPaths: possiblePaths,
        selectedPath: distPath
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
