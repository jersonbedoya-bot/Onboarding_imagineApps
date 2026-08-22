import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/server/repositories/__tests__/setup.ts"],
    // mongodb-memory-server descarga el binario de mongod la primera vez.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
