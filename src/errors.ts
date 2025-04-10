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
