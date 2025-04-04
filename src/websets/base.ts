/**
 * Base client for Websets API
 */
import { Exa } from "../index";
import { QueryParams, RequestBody } from "./types";

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  /**
   * Cursor for pagination
   */
  cursor?: string;
  
  /**
   * Maximum number of items per page
   */
  limit?: number;
}

/**
 * Base client class for all Websets-related API clients
 */
export class WebsetsBaseClient {
  protected client: Exa;

  /**
   * Initialize a new Websets base client
   * @param client The Exa client instance
   */
  constructor(client: Exa) {
    this.client = client;
  }

  /**
   * Make a request to the Websets API
   * @param endpoint The endpoint path
   * @param method The HTTP method
   * @param data Optional request body data
   * @param params Optional query parameters
   * @returns The response JSON
   * @throws Error with detailed message if the request fails
   */
  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams
  ): Promise<T> {
    try {
      return await this.client.request<T>(`/websets${endpoint}`, method, data, params);
    } catch (error) {
      // Enhance error message with context about the request
      const operation = this.getOperationFromMethod(method);
      const resource = this.getResourceFromEndpoint(endpoint);
      const message = error instanceof Error ? error.message : String(error);
      
      throw new Error(`Failed to ${operation} ${resource}: ${message}`);
    }
  }
  
  /**
   * Helper to build pagination parameters
   * @param pagination The pagination parameters
   * @returns QueryParams object with pagination parameters
   */
  protected buildPaginationParams(pagination?: PaginationParams): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;
    
    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;
    
    return params;
  }
  
  /**
   * Helper to get operation name from HTTP method
   */
  private getOperationFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case "GET": return "retrieve";
      case "POST": return "create or update";
      case "DELETE": return "delete";
      case "PATCH": return "update";
      default: return method.toLowerCase();
    }
  }
  
  /**
   * Helper to get resource name from endpoint
   */
  private getResourceFromEndpoint(endpoint: string): string {
    // Extract resource name from endpoint path
    const parts = endpoint.split("/").filter(p => p);
    if (parts.length === 0) return "webset resource";
    
    const lastPart = parts[parts.length - 1];
    if (lastPart === "cancel") {
      return parts.length > 2 ? parts[parts.length - 3] : "resource";
    }
    
    return parts[parts.length - 1];
  }
}