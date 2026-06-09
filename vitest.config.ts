import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@blocksite/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@blocksite/storage": resolve(__dirname, "packages/storage/src/index.ts"),
      "@blocksite/event-bus": resolve(__dirname, "packages/event-bus/src/index.ts"),
      "@blocksite/rules": resolve(__dirname, "packages/rules/src/index.ts"),
      "@blocksite/schedule": resolve(__dirname, "packages/schedule/src/index.ts"),
      "@blocksite/auth": resolve(__dirname, "packages/auth/src/index.ts"),
      "@blocksite/unlock": resolve(__dirname, "packages/unlock/src/index.ts"),
      "@blocksite/stats": resolve(__dirname, "packages/stats/src/index.ts"),
      "@blocksite/presets": resolve(__dirname, "packages/presets/src/index.ts"),
      "@blocksite/import-export": resolve(__dirname, "packages/import-export/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["packages/*/__tests__/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
