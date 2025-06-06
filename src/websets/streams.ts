/**
 * Client for managing Webset Streams
 */
import { Exa } from "..";
import { PaginationParams, WebsetsBaseClient } from "./base";
import {
  CreateStreamParameters,
  ListStreamRunsResponse,
  ListStreamsResponse,
  Stream,
  StreamRun,
  UpdateStream,
} from "./openapi";

/**
 * Options for listing streams
 */
export interface ListStreamsOptions extends PaginationParams {
  /**
   * The id of the Webset to list streams for
   */
  websetId?: string;
}

/**
 * Client for managing Stream Runs
 */
export class WebsetStreamRunsClient extends WebsetsBaseClient {
  /**
   * List all runs for a Stream
   * @param streamId The ID of the Stream
   * @param options Pagination options
   * @returns The list of Stream runs
   */
  async list(
    streamId: string,
    options?: PaginationParams
  ): Promise<ListStreamRunsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListStreamRunsResponse>(
      `/v0/streams/${streamId}/runs`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Get a specific Stream run
   * @param streamId The ID of the Stream
   * @param runId The ID of the Stream run
   * @returns The Stream run
   */
  async get(streamId: string, runId: string): Promise<StreamRun> {
    return this.request<StreamRun>(
      `/v0/streams/${streamId}/runs/${runId}`,
      "GET"
    );
  }
}

/**
 * Client for managing Webset Streams
 */
export class WebsetStreamsClient extends WebsetsBaseClient {
  /**
   * Client for managing Stream Runs
   */
  runs: WebsetStreamRunsClient;

  constructor(client: Exa) {
    super(client);
    this.runs = new WebsetStreamRunsClient(client);
  }

  /**
   * Create a Stream
   * @param params The stream parameters
   * @returns The created Stream
   */
  async create(params: CreateStreamParameters): Promise<Stream> {
    return this.request<Stream>("/v0/streams", "POST", params);
  }

  /**
   * Get a Stream by ID
   * @param id The ID of the Stream
   * @returns The Stream
   */
  async get(id: string): Promise<Stream> {
    return this.request<Stream>(`/v0/streams/${id}`, "GET");
  }

  /**
   * List all Streams
   * @param options Pagination and filtering options
   * @returns The list of Streams
   */
  async list(options?: ListStreamsOptions): Promise<ListStreamsResponse> {
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      websetId: options?.websetId,
    };
    return this.request<ListStreamsResponse>(
      "/v0/streams",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Update a Stream
   * @param id The ID of the Stream
   * @param params The stream update parameters (status, metadata)
   * @returns The updated Stream
   */
  async update(id: string, params: UpdateStream): Promise<Stream> {
    return this.request<Stream>(`/v0/streams/${id}`, "PATCH", params);
  }

  /**
   * Delete a Stream
   * @param id The ID of the Stream
   * @returns The deleted Stream
   */
  async delete(id: string): Promise<Stream> {
    return this.request<Stream>(`/v0/streams/${id}`, "DELETE");
  }
}
