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
   * Create a new ExaError
   * @param message Error message
   * @param statusCode HTTP status code
   * @param timestamp ISO timestamp from API
   * @param path Path that caused the error
   */
  constructor(
    message: string,
    statusCode: number,
    timestamp?: string,
    path?: string
  ) {
    super(message);
    this.name = "ExaError";
    this.statusCode = statusCode;
    this.timestamp = timestamp ?? new Date().toISOString();
    this.path = path;
  }
}

/**
 * Error thrown when API rate limits are exceeded (HTTP 429).
 * Check the `retryAfter` property for when to retry.
 */
export class RateLimitError extends ExaError {
  /**
   * Number of seconds to wait before retrying (from Retry-After header)
   */
  retryAfter?: number;

  constructor(
    message: string,
    timestamp?: string,
    path?: string,
    retryAfter?: number
  ) {
    super(message, HttpStatusCode.TooManyRequests, timestamp, path);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when authentication fails (HTTP 401).
 * Usually indicates an invalid or missing API key.
 */
export class AuthenticationError extends ExaError {
  constructor(message: string, timestamp?: string, path?: string) {
    super(message, HttpStatusCode.Unauthorized, timestamp, path);
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when request validation fails (HTTP 400).
 * Check the `field` property for which field caused the error.
 */
export class ValidationError extends ExaError {
  /**
   * The field that caused the validation error (if available)
   */
  field?: string;

  /**
   * The validation constraint that was violated (if available)
   */
  constraint?: string;

  constructor(
    message: string,
    timestamp?: string,
    path?: string,
    field?: string,
    constraint?: string
  ) {
    super(message, HttpStatusCode.BadRequest, timestamp, path);
    this.name = "ValidationError";
    this.field = field;
    this.constraint = constraint;
  }
}

/**
 * Error thrown when a request times out.
 * This can be a client-side timeout (e.g., AbortController) or server timeout (HTTP 408).
 */
export class TimeoutError extends ExaError {
  /**
   * The timeout duration in milliseconds that was exceeded
   */
  timeoutMs?: number;

  constructor(message: string, timeoutMs?: number, path?: string) {
    super(message, HttpStatusCode.RequestTimeout, new Date().toISOString(), path);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when a requested resource is not found (HTTP 404).
 */
export class NotFoundError extends ExaError {
  /**
   * The resource ID that was not found (if available)
   */
  resourceId?: string;

  constructor(
    message: string,
    timestamp?: string,
    path?: string,
    resourceId?: string
  ) {
    super(message, HttpStatusCode.NotFound, timestamp, path);
    this.name = "NotFoundError";
    this.resourceId = resourceId;
  }
}

/**
 * Error thrown when the server encounters an internal error (HTTP 500/503).
 * These errors are typically transient and can be retried.
 */
export class ServerError extends ExaError {
  /**
   * Whether this error is likely transient and can be retried
   */
  retryable: boolean;

  constructor(
    message: string,
    statusCode: number = HttpStatusCode.InternalServerError,
    timestamp?: string,
    path?: string
  ) {
    super(message, statusCode, timestamp, path);
    this.name = "ServerError";
    this.retryable =
      statusCode === HttpStatusCode.InternalServerError ||
      statusCode === HttpStatusCode.ServiceUnavailable;
  }
}
