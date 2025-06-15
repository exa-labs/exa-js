/**
 * Client for managing Imports
 */
import { ExaError, HttpStatusCode } from "../errors";
import { PaginationParams, WebsetsBaseClient } from "./base";
import {
  CreateImportParameters,
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
 * Client for managing Imports
 */
export class ImportsClient extends WebsetsBaseClient {
  /**
   * Create a new Import
   * @param params The import creation parameters
   * @returns The created Import response with upload URL
   */
  async create(params: CreateImportParameters): Promise<CreateImportResponse> {
    return this.request<CreateImportResponse>("/v0/imports", "POST", params);
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
