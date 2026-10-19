/**
 * Client for managing Imports
 */
import { ExaAbortError, ExaError, HttpStatusCode } from "../errors";
import { PaginationParams, WebsetsBaseClient } from "./base";
import {
  CreateImportParameters,
  CreateImportParametersFormat,
  CreateImportResponse,
  Import,
  ImportStatus,
  ListImportsResponse,
  UpdateImport,
} from "./openapi";
import {
  resolveRequestSignal,
  sleep,
  withClientDefaults,
  type RequestOptions,
} from "../request-options";

/**
 * Options for waiting until import completion
 */
export interface WaitUntilCompletedOptions {
  /**
   * Maximum time to wait in milliseconds (default: 5 minutes)
   */
  timeout?: number;
  /**
   * How often to poll for status in milliseconds (default: 2 seconds)
   */
  pollInterval?: number;
  /**
   * Callback function called on each poll with the current status
   */
  onPoll?: (status: ImportStatus) => void;
}

/**
 * Parameters for creating an import with CSV data
 */
export interface CreateImportWithCsvParameters {
  /**
   * Title of the import
   */
  title: string;
  /**
   * Entity type and configuration
   */
  entity: CreateImportParameters["entity"];
  /**
   * Optional metadata
   */
  metadata?: CreateImportParameters["metadata"];
  /**
   * Optional CSV-specific parameters
   */
  csv?: CreateImportParameters["csv"];
}

/**
 * CSV data to import, as text or as UTF-8 bytes in a `Uint8Array`, such as a
 * Node.js `Buffer`.
 */
export type CsvDataInput = string | Uint8Array;

/**
 * Client for managing Imports
 */
export class ImportsClient extends WebsetsBaseClient {
  /**
   * Create a new Import (basic version - returns upload URL)
   * @param params The import creation parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The created Import response with upload URL
   */
  async create(
    params: CreateImportParameters,
    csv?: undefined,
    requestOptions?: RequestOptions
  ): Promise<CreateImportResponse>;

  /**
   * Create a new Import with CSV data (handles upload)
   * @param params The import creation parameters (without size/count - calculated automatically)
   * @param csv CSV data as a string, or as UTF-8 bytes in a Uint8Array such as a Buffer
   * @param requestOptions Per-call request options. `signal` and `timeout` also apply to the upload. `body`, `headers` and `query` apply to the create request only
   * @returns The create response, once the CSV is uploaded. The import is not
   *   fetched again, so its status is the one it was created with. Call `get`
   *   or `waitUntilCompleted` for its current state.
   */
  async create(
    params: CreateImportWithCsvParameters,
    csv: CsvDataInput,
    requestOptions?: RequestOptions
  ): Promise<Import>;

  async create(
    params: CreateImportParameters | CreateImportWithCsvParameters,
    csv?: CsvDataInput,
    requestOptions?: RequestOptions
  ): Promise<CreateImportResponse | Import> {
    const scoped = this.withRequestOptions(requestOptions);
    if (csv === undefined) {
      return scoped.request<CreateImportResponse>(
        "/v0/imports",
        "POST",
        params as CreateImportParameters
      );
    }

    // The bytes to upload and their text, with the web encoding APIs rather
    // than Node's Buffer, so a CSV upload also works where Buffer is absent.
    // A Buffer is a Uint8Array and is uploaded as is.
    let csvBytes: Uint8Array;
    let csvText: string;
    if (typeof csv === "string") {
      csvBytes = new TextEncoder().encode(csv);
      csvText = csv;
    } else if (csv instanceof Uint8Array) {
      csvBytes = csv;
      csvText = new TextDecoder().decode(csv);
    } else {
      throw new ExaError(
        "Invalid CSV data input. Must be a string or a Uint8Array such as a Buffer",
        HttpStatusCode.BadRequest
      );
    }

    const sizeInBytes = csvBytes.byteLength;
    const sizeInMB = Math.max(1, Math.ceil(sizeInBytes / (1024 * 1024)));

    const lines = csvText.split("\n").filter((line) => line.trim().length > 0);
    const recordCount = Math.max(0, lines.length - 1); // Subtract 1 for header

    if (sizeInMB > 50) {
      throw new ExaError(
        `CSV file too large: ${sizeInMB}MB. Maximum size is 50MB.`,
        HttpStatusCode.BadRequest
      );
    }

    if (recordCount === 0) {
      throw new ExaError(
        "CSV file appears to have no data records (only header or empty)",
        HttpStatusCode.BadRequest
      );
    }

    const createParams: CreateImportParameters = {
      title: params.title,
      format: CreateImportParametersFormat.csv,
      entity: params.entity,
      size: sizeInBytes,
      count: recordCount,
      metadata: params.metadata,
      csv: (params as CreateImportWithCsvParameters).csv,
    };

    const importResponse = await scoped.request<CreateImportResponse>(
      "/v0/imports",
      "POST",
      createParams
    );

    // The upload goes to a presigned URL rather than through the client, so
    // it resolves the same transport options itself.
    const upload = resolveRequestSignal(
      withClientDefaults(this.client, scoped.requestOptions)
    );
    try {
      const uploadResponse = await fetch(importResponse.uploadUrl, {
        method: "PUT",
        body: csvBytes as BodyInit,
        signal: upload.signal,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new ExaError(
          `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`,
          HttpStatusCode.BadRequest
        );
      }
    } catch (error) {
      const requestError = upload.toRequestError(error);
      if (
        requestError instanceof ExaError ||
        requestError instanceof ExaAbortError
      ) {
        throw requestError;
      }
      throw new ExaError(
        `Failed to upload CSV data: ${(error as Error).message}`,
        HttpStatusCode.BadRequest
      );
    } finally {
      upload.dispose();
    }

    return importResponse;
  }

  /**
   * Get an Import by ID
   * @param id The ID of the Import
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Import
   */
  async get(id: string, requestOptions?: RequestOptions): Promise<Import> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Import>(`/v0/imports/${id}`, "GET");
  }

  /**
   * List all Imports
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Imports
   */
  async list(
    options?: PaginationParams,
    requestOptions?: RequestOptions
  ): Promise<ListImportsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListImportsResponse>(
      "/v0/imports",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Update an Import
   * @param id The ID of the Import
   * @param params The import update parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The updated Import
   */
  async update(
    id: string,
    params: UpdateImport,
    requestOptions?: RequestOptions
  ): Promise<Import> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Import>(`/v0/imports/${id}`, "PATCH", params);
  }

  /**
   * Delete an Import
   * @param id The ID of the Import
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The deleted Import
   */
  async delete(id: string, requestOptions?: RequestOptions): Promise<Import> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Import>(`/v0/imports/${id}`, "DELETE");
  }

  /**
   * Wait until an Import is completed or failed
   * @param id The ID of the Import
   * @param options Configuration options for timeout and polling
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Import once it reaches a final state (completed or failed)
   * @throws Error if the Import does not complete within the timeout or fails
   */
  async waitUntilCompleted(
    id: string,
    options?: WaitUntilCompletedOptions,
    requestOptions?: RequestOptions
  ): Promise<Import> {
    const scoped = this.withRequestOptions(requestOptions);
    const timeout = options?.timeout ?? 30 * 60 * 1000;
    const pollInterval = options?.pollInterval ?? 2_000;
    const onPoll = options?.onPoll;

    const startTime = Date.now();

    while (true) {
      const importItem = await scoped.get(id);

      if (onPoll) {
        onPoll(importItem.status);
      }

      if (importItem.status === ImportStatus.completed) {
        return importItem;
      }

      if (importItem.status === ImportStatus.failed) {
        throw new ExaError(
          `Import ${id} failed: ${importItem.failedMessage || "Unknown error"}`,
          HttpStatusCode.BadRequest
        );
      }

      if (Date.now() - startTime > timeout) {
        throw new ExaError(
          `Import ${id} did not complete within ${timeout}ms. Current status: ${importItem.status}`,
          HttpStatusCode.RequestTimeout
        );
      }

      await sleep(pollInterval, scoped.requestOptions?.signal);
    }
  }

  /**
   * Iterate through all Imports, handling pagination automatically
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Imports
   */
  async *listAll(
    options?: PaginationParams,
    requestOptions?: RequestOptions
  ): AsyncGenerator<Import> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list(pageOptions);

      for (const importItem of response.data) {
        yield importItem;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all Imports into an array
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Imports
   */
  async getAll(
    options?: PaginationParams,
    requestOptions?: RequestOptions
  ): Promise<Import[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const imports: Import[] = [];
    for await (const importItem of scoped.listAll(options)) {
      imports.push(importItem);
    }
    return imports;
  }
}
