import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "node",
    environmentMatchGlobs: [["test/ui/**", "jsdom"]],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    testTimeout: 20000,
  },
});
