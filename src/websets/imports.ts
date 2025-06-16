/**
 * Client for managing Imports
 */
import { ExaError, HttpStatusCode } from "../errors";
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
 * CSV data input - can be raw data or buffer
 */
export type CsvDataInput = string | Buffer;

/**
 * Client for managing Imports
 */
export class ImportsClient extends WebsetsBaseClient {
  /**
   * Create a new Import (basic version - returns upload URL)
   * @param params The import creation parameters
   * @returns The created Import response with upload URL
   */
  async create(params: CreateImportParameters): Promise<CreateImportResponse>;

  /**
   * Create a new Import with CSV data (convenient version - handles upload)
   * @param params The import creation parameters (without size/count - calculated automatically)
   * @param csv CSV data as string or Buffer
   * @returns The Import after upload (not waited for completion)
   */
  async create(
    params: CreateImportWithCsvParameters,
    csv: CsvDataInput
  ): Promise<Import>;

  async create(
    params: CreateImportParameters | CreateImportWithCsvParameters,
    csv?: CsvDataInput
  ): Promise<CreateImportResponse | Import> {
    // If no CSV data provided, use the original behavior
    if (csv === undefined) {
      return this.request<CreateImportResponse>(
        "/v0/imports",
        "POST",
        params as CreateImportParameters
      );
    }

    // Convert CSV data to Buffer and calculate metrics
    let csvBuffer: Buffer;
    if (typeof csv === "string") {
      csvBuffer = Buffer.from(csv, "utf8");
    } else if (Buffer.isBuffer(csv)) {
      csvBuffer = csv;
    } else {
      throw new ExaError(
        "Invalid CSV data input. Must be string or Buffer",
        HttpStatusCode.BadRequest
      );
    }

    // Calculate size in bytes (for S3 ContentLength)
    const sizeInBytes = csvBuffer.length;
    const sizeInMB = Math.max(1, Math.ceil(sizeInBytes / (1024 * 1024)));

    // Calculate record count (number of lines minus header)
    const csvText = csvBuffer.toString("utf8");
    const lines = csvText.split("\n").filter((line) => line.trim().length > 0);
    const recordCount = Math.max(0, lines.length - 1); // Subtract 1 for header

    // Validate reasonable limits
    if (sizeInMB > 50) {
      // 50MB limit
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

    // Create the import with calculated parameters
    const createParams: CreateImportParameters = {
      title: params.title,
      format: CreateImportParametersFormat.csv,
      entity: params.entity,
      size: sizeInBytes, // Send bytes, not MB!
      count: recordCount,
      metadata: params.metadata,
      csv: (params as CreateImportWithCsvParameters).csv,
    };

    const importResponse = await this.request<CreateImportResponse>(
      "/v0/imports",
      "POST",
      createParams
    );

    // Upload the CSV data
    try {
      const uploadResponse = await fetch(importResponse.uploadUrl, {
        method: "PUT",
        body: csvBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new ExaError(
          `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`,
          HttpStatusCode.BadRequest
        );
      }
    } catch (error) {
      // Clean up the created import if upload fails
      try {
        await this.delete(importResponse.id);
      } catch (deleteError) {
        // Ignore cleanup errors
      }

      if (error instanceof ExaError) {
        throw error;
      }
      throw new ExaError(
        `Failed to upload CSV data: ${(error as Error).message}`,
        HttpStatusCode.BadRequest
      );
    }

    // Return the import status after upload
    return this.get(importResponse.id);
  }

  /**
   * Get an Import by ID
   * @param id The ID of the Import
   * @returns The Import
   */
  async get(id: string): Promise<Import> {
    return this.request<Import>(`/v0/imports/${id}`, "GET");
  }

  /**
   * List all Imports
   * @param options Pagination options
   * @returns The list of Imports
   */
  async list(options?: PaginationParams): Promise<ListImportsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListImportsResponse>(
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
   * @returns The updated Import
   */
  async update(id: string, params: UpdateImport): Promise<Import> {
    return this.request<Import>(`/v0/imports/${id}`, "PATCH", params);
  }

  /**
   * Delete an Import
   * @param id The ID of the Import
   * @returns The deleted Import
   */
  async delete(id: string): Promise<Import> {
    return this.request<Import>(`/v0/imports/${id}`, "DELETE");
  }

  /**
   * Wait until an Import is completed or failed
   * @param id The ID of the Import
   * @param options Configuration options for timeout and polling
   * @returns The Import once it reaches a final state (completed or failed)
   * @throws Error if the Import does not complete within the timeout or fails
   */
  async waitUntilCompleted(
    id: string,
    options?: WaitUntilCompletedOptions
  ): Promise<Import> {
    const timeout = options?.timeout || 300000; // 5 minutes default
    const pollInterval = options?.pollInterval || 2000; // 2 seconds default
    const onPoll = options?.onPoll;

    const startTime = Date.now();

    while (true) {
      const importItem = await this.get(id);

      if (onPoll) {
        onPoll(importItem.status);
      }

      // Check if import reached a final state
      if (importItem.status === ImportStatus.completed) {
        return importItem;
      }

      if (importItem.status === ImportStatus.failed) {
        throw new ExaError(
          `Import ${id} failed: ${importItem.failedMessage || "Unknown error"}`,
          HttpStatusCode.BadRequest
        );
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new ExaError(
          `Import ${id} did not complete within ${timeout}ms. Current status: ${importItem.status}`,
          HttpStatusCode.RequestTimeout
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
