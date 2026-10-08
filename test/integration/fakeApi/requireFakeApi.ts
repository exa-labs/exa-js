/**
 * Setup file for offline integration runs: fails every test file whose
 * environment does not point at a loopback server, so an offline run can
 * never fall back to the hosted API.
 */
const baseURL = process.env.EXA_BASE_URL ?? "";

if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseURL)) {
  throw new Error(
    `Offline integration runs need EXA_BASE_URL to point at the local fake API server, got "${baseURL}"`
  );
}
