import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.tsx",
      "client/**/*.spec.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "*.config.ts",
        "**/*.d.ts",
        "drizzle/",
        "PDF作成ツール/"
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client/src"),
      "@server": path.resolve(import.meta.dirname, "./server"),
      "@drizzle": path.resolve(import.meta.dirname, "./drizzle")
    }
  }
});
