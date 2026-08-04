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
 * Structured details from APIs that return a nested error envelope
 * ({ error: { type, code, message } }), e.g. the agent surface.
 */
export interface ExaErrorDetails {
  /**
   * Error category from the API, e.g. "INVALID_REQUEST" or "CONFLICT"
   */
  type?: string;

  /**
   * Specific error code from the API, e.g. "MONITOR_NOT_FOUND"
   */
  code?: string;

  /**
   * Request ID from the API, when provided
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
   * Error category from the API (nested error envelopes only)
   */
  type?: string;

  /**
   * Specific error code from the API (nested error envelopes only)
   */
  code?: string;

  /**
   * Request ID from the API, when provided
   */
  requestId?: string;

  /**
   * Create a new ExaError
   * @param message Error message
   * @param statusCode HTTP status code
   * @param timestamp ISO timestamp from API
   * @param path Path that caused the error
   * @param details Structured details from nested error envelopes
   */
  constructor(
    message: string,
    statusCode: number,
    timestamp?: string,
    path?: string,
    details?: ExaErrorDetails
  ) {
    super(message);
    this.name = "ExaError";
    this.statusCode = statusCode;
    this.timestamp = timestamp ?? new Date().toISOString();
    this.path = path;
    this.type = details?.type;
    this.code = details?.code;
    this.requestId = details?.requestId;
  }
}
