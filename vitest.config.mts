import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));
const engineDirectory = fileURLToPath(new URL("./packages/nutrition-engine/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": sourceDirectory,
      "@fitai/nutrition-engine": engineDirectory,
      "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "apps/mobile/src/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/features/**/domain.ts", "src/services/**/normalize.ts", "packages/nutrition-engine/src/**/*.ts"]
    }
  }
});
