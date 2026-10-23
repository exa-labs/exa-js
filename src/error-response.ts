/**
 * Reading Exa API response bodies, and turning an error response into an
 * `ExaError`.
 *
 * `Exa.request` and every streaming method build their errors through
 * `exaErrorFromResponse`, so an error response yields the same message,
 * `requestId`, `path` and envelope fields whether the method streams or not.
 */
import { ExaError } from "./errors";

/** Longest snippet of a non-JSON response body to include in error messages. */
const NON_JSON_BODY_SNIPPET_LENGTH = 500;

/**
 * Reads a fetch Response body once and attempts to parse it as JSON.
 *
 * API gateways and proxies (Cloudflare, load balancers, nginx) sometimes
 * return HTML or plain-text error pages even when the SDK expects JSON.
 * Calling `response.json()` on those bodies throws an opaque
 * `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
 * that hides the real HTTP status. Reading the body as text first lets the
 * caller surface the actual status and a snippet of the response instead.
 *
 * @returns The parsed JSON value (or `undefined` when the body is empty or not
 *   valid JSON) alongside the raw response text.
 */
export async function readResponseBody(
  response: Response
): Promise<{ json: any; text: string }> {
  const text = await response.text();
  if (!text) {
    return { json: undefined, text };
  }
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: undefined, text };
  }
}

/**
 * Reads a successful response's JSON body.
 *
 * @param response - A 2xx response. Its body is consumed.
 * @param path - The API path the request went to, e.g. `/search`.
 * @returns The parsed body, or `undefined` when the body is empty.
 * @throws {ExaError} When the body is not JSON. A proxy can answer with a 2xx
 *   error or redirect page, and the error carries the status and a snippet of
 *   it instead of an opaque parse error.
 */
export async function readJsonBody(
  response: Response,
  path: string
): Promise<unknown> {
  const { json, text } = await readResponseBody(response);
  if (json === undefined && text) {
    throw new ExaError(
      `Expected a JSON response but received a non-JSON body (status ${response.status}): ${truncateResponseBody(text)}`,
      response.status,
      new Date().toISOString(),
      path
    );
  }
  return json;
}

/**
 * Whether a `content-type` header names JSON, which is `application/json` or
 * a `+json` media type, with any parameters.
 */
export function isJsonContentType(contentType: string | null): boolean {
  const mediaType = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return mediaType === "application/json" || mediaType.endsWith("+json");
}

/**
 * Collapses whitespace and truncates a non-JSON response body so it stays
 * readable when embedded in an error message.
 */
export function truncateResponseBody(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > NON_JSON_BODY_SNIPPET_LENGTH
    ? `${collapsed.slice(0, NON_JSON_BODY_SNIPPET_LENGTH)}…`
    : collapsed;
}

/**
 * Reads an error response whole and returns the `ExaError` it describes.
 *
 * - A structured envelope (`{ error: { type, code, message, detail },
 *   requestId }`) gives the message and the envelope fields.
 * - A legacy body (`{ error: "...", message?, requestId? }`) gives
 *   `error` and `message` joined, and `requestId`.
 * - A body that is not a JSON object (an HTML page from a proxy, plain text,
 *   nothing) gives the status and a snippet of the body.
 *
 * `statusCode`, `timestamp` and `path` come from the body when it has them,
 * else from the response, the current time and `path`.
 *
 * @param response - A response whose status is not 2xx; its body is consumed.
 * @param path - The API path the request went to, e.g. `/answer`.
 */
export async function exaErrorFromResponse(
  response: Response,
  path: string
): Promise<ExaError> {
  const { json, text } = await readResponseBody(response);

  // Gateways/proxies can return non-JSON (e.g. HTML) error pages. Surface
  // the real status and a snippet of the body rather than throwing an
  // opaque JSON parse error that hides the underlying failure.
  if (!json || typeof json !== "object") {
    const snippet = truncateResponseBody(text);
    const message = snippet
      ? `Request failed with status ${response.status}. Response body was not valid JSON: ${snippet}`
      : `Request failed with status ${response.status}.`;
    return new ExaError(
      message,
      response.status,
      new Date().toISOString(),
      path
    );
  }

  const errorData = json;
  if (!errorData.statusCode) {
    errorData.statusCode = response.status;
  }
  if (!errorData.timestamp) {
    errorData.timestamp = new Date().toISOString();
  }
  if (!errorData.path) {
    errorData.path = path;
  }

  // Structured envelope (`error` is an object): message and metadata live
  // inside it — e.g. { error: { type, code, message, detail }, requestId }.
  const envelope =
    typeof errorData.error === "object" && errorData.error !== null
      ? (errorData.error as {
          type?: string;
          code?: string;
          message?: string;
          detail?: unknown;
          requestId?: string;
        })
      : undefined;
  let message: string;
  if (envelope) {
    message = envelope.message || errorData.message || "Unknown error";
  } else {
    message = errorData.error || "Unknown error";
    if (errorData.message) {
      message += (message.length > 0 ? ". " : "") + errorData.message;
    }
  }
  return new ExaError(
    message,
    response.status,
    errorData.timestamp,
    errorData.path,
    envelope
      ? {
          type: envelope.type,
          code: envelope.code,
          detail: envelope.detail,
          requestId: errorData.requestId ?? envelope.requestId,
        }
      : errorData.requestId
        ? { requestId: errorData.requestId }
        : undefined
  );
}
