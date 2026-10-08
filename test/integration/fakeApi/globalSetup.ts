/**
 * Vitest global setup for offline integration runs: starts the local fake API
 * server and points `EXA_BASE_URL` and `EXA_API_KEY` at it before any test
 * worker starts, so every client the tests build talks to the fake server.
 */
import { startFakeApi } from "./server";

export default async function setup(): Promise<() => Promise<void>> {
  const api = await startFakeApi();
  const saved = {
    EXA_BASE_URL: process.env.EXA_BASE_URL,
    EXA_API_KEY: process.env.EXA_API_KEY,
  };
  process.env.EXA_BASE_URL = api.url;
  process.env.EXA_API_KEY = api.apiKey;
  return async () => {
    await api.close();
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}
