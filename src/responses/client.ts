/**
 * Client for Exa's OpenAI-compatible Responses API.
 */

import { Exa } from "../index";
import { Response, ResponseCreateParams } from "./types";

export class ResponsesClient {
  constructor(private readonly client: Exa) {}

  /**
   * Create a non-streaming Agent response.
   */
  async create(params: ResponseCreateParams): Promise<Response> {
    if (params.stream) {
      throw new Error("Streaming Responses are not supported yet.");
    }

    const payload: ResponseCreateParams = {
      model: "agent",
      ...params,
    };

    return this.client.request<Response>("/v1/responses", "POST", payload);
  }
}
