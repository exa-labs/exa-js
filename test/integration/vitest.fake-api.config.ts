/**
 * Runs the integration suite offline, against the local fake API server in
 * ./fakeApi instead of the hosted API:
 *
 *   vitest run --config test/integration/vitest.fake-api.config.ts
 */
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import integrationConfig from "../../vitest.integration.config";

export default mergeConfig(
  integrationConfig,
  defineConfig({
    root: fileURLToPath(new URL("../..", import.meta.url)),
    test: {
      globalSetup: ["test/integration/fakeApi/globalSetup.ts"],
      setupFiles: ["test/integration/fakeApi/requireFakeApi.ts"],
      coverage: { include: ["src/**"], reporter: ["text-summary"] },
    },
  })
);
