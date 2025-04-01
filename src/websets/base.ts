/**
 * Base client for Websets API
 */
import { Exa } from "../index";

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
   */
  protected async request(
    endpoint: string,
    method: string = "POST",
    data?: Record<string, any>,
    params?: Record<string, any>
  ): Promise<any> {
    return this.client.request(`/websets${endpoint}`, method, data, params);
  }
}