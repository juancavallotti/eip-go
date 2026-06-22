import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // The app is mostly thin wiring around @octo/editor (tested in the package);
    // don't fail the workspace `test` run before app-specific tests exist.
    passWithNoTests: true,
    testTimeout: 15000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    // `.next` contains a copy of the app source (standalone output tracing); never
    // scan it for tests — those copies have no tsconfig and would fail to load.
    exclude: [...configDefaults.exclude, "**/.next/**"],
    css: true,
  },
});
