/**
 * HTTP status codes
 */
export enum HttpStatusCode {
  BadRequest = 400,
  NotFound = 404,
  Unauthorized = 401,
  Forbidden = 403,
  TooManyRequests = 429,
  RequestTimeout = 408,
  InternalServerError = 500,
  ServiceUnavailable = 503,
}

/**
 * Structured fields from the API's error envelope
 * (e.g. `{ "error": { "type", "code", "message", "detail" }, "requestId" }`).
 */
export interface ExaErrorEnvelope {
  /**
   * Error category, e.g. "NOT_FOUND", "INVALID_REQUEST", "CONFLICT"
   */
  type?: string;

  /**
   * Specific error code, e.g. "MONITOR_NOT_FOUND"
   */
  code?: string;

  /**
   * Additional context, e.g. which validation rule failed
   */
  detail?: unknown;

  /**
   * Server-side request id for support/debugging
   */
  requestId?: string;
}

/**
 * Base error class for all Exa API errors
 */
export class ExaError extends Error {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * ISO timestamp from API
   */
  timestamp?: string;

  /**
   * Path that caused the error (may be undefined for client-side errors)
   */
  path?: string;

  /**
   * Error category from the API's error envelope, e.g. "NOT_FOUND"
   */
  type?: string;

  /**
   * Specific error code from the API's error envelope, e.g. "MONITOR_NOT_FOUND"
   */
  code?: string;

  /**
   * Additional context from the API's error envelope
   */
  detail?: unknown;

  /**
   * Server-side request id for support/debugging
   */
  requestId?: string;

  /**
   * Create a new ExaError
   * @param message Error message
   * @param statusCode HTTP status code
   * @param timestamp ISO timestamp from API
   * @param path Path that caused the error
   * @param envelope Structured fields from the API's error envelope
   */
  constructor(
    message: string,
    statusCode: number,
    timestamp?: string,
    path?: string,
    envelope?: ExaErrorEnvelope
  ) {
    super(message);
    this.name = "ExaError";
    this.statusCode = statusCode;
    this.timestamp = timestamp ?? new Date().toISOString();
    this.path = path;
    if (envelope) {
      this.type = envelope.type;
      this.code = envelope.code;
      this.detail = envelope.detail;
      this.requestId = envelope.requestId;
    }
  }
}

/**
 * Thrown when a request is cancelled through the caller's `AbortSignal`.
 * `name` is `"AbortError"`. Not an `ExaError`, so it has no `statusCode`.
 */
export class ExaAbortError extends Error {
  /**
   * The error `fetch` rejected with, or the signal's abort reason
   */
  cause?: unknown;

  /**
   * Create a new ExaAbortError
   * @param cause The underlying fetch rejection or abort reason
   */
  constructor(cause?: unknown) {
    super("Request was aborted.");
    this.name = "AbortError";
    this.cause = cause;
  }
}

/**
 * Thrown when a request exceeds its `timeout`. `name` is `"TimeoutError"`
 * and `statusCode` is 408.
 */
export class ExaTimeoutError extends ExaError {
  /**
   * The timeout that elapsed, in milliseconds
   */
  timeout: number;

  /**
   * The error `fetch` rejected with
   */
  cause?: unknown;

  /**
   * Create a new ExaTimeoutError
   * @param timeout The timeout that elapsed, in milliseconds
   * @param path Path of the request that timed out
   * @param cause The underlying fetch rejection
   */
  constructor(timeout: number, path?: string, cause?: unknown) {
    super(
      `Request timed out after ${timeout}ms.`,
      HttpStatusCode.RequestTimeout,
      undefined,
      path
    );
    this.name = "TimeoutError";
    this.timeout = timeout;
    this.cause = cause;
  }
}
