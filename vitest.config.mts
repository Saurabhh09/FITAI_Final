import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));
const engineDirectory = fileURLToPath(new URL("./packages/nutrition-engine/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": sourceDirectory,
      "@fitai/nutrition-engine": engineDirectory,
      "@react-native-async-storage/async-storage": fileURLToPath(new URL("./apps/mobile/src/lib/async-storage-mock.ts", import.meta.url)),
      "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "apps/mobile/src/**/*.test.ts", "apps/mobile/src/**/*.test.tsx", "packages/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/features/**/domain.ts", "src/services/**/normalize.ts", "packages/nutrition-engine/src/**/*.ts"]
    }
  }
});
