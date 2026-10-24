import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// Unit tests for apps/web and packages/shared. Test files sit next to the code
// they cover (`*.test.ts`). The mobile app will use jest-expo when it has logic
// worth testing.
export default defineConfig({
  resolve: {
    alias: {
      "@/": path("./apps/web/src/"),
      // Next only allows `server-only` in server bundles; tests run in Node.
      "server-only": path("./test/empty.ts"),
    },
  },
  test: {
    include: ["apps/web/src/**/*.test.ts", "packages/shared/src/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
