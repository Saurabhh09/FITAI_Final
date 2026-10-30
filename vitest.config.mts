import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const mobileSrcDirectory = fileURLToPath(new URL("./apps/mobile/src", import.meta.url));
const engineDirectory = fileURLToPath(new URL("./packages/nutrition-engine/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": mobileSrcDirectory,
      "@fitai/nutrition-engine": engineDirectory,
      "@react-native-async-storage/async-storage": fileURLToPath(new URL("./apps/mobile/src/lib/async-storage-mock.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["apps/mobile/src/**/*.test.ts", "apps/mobile/src/**/*.test.tsx", "packages/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["packages/nutrition-engine/src/**/*.ts", "apps/mobile/src/**/*.ts"]
    }
  }
});
