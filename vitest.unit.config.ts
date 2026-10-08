import { configDefaults, defineConfig } from "vitest/config";

// Every test except the integration suite, which talks to an API server and
// runs through vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "test/integration/**"],
  },
});
