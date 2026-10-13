import { Exa } from "../index";
import { WebsetsBaseClient } from "./base";
import { Event, EventType, ListEventsResponse } from "./openapi";
import { type RequestOptions } from "../request-options";

/**
 * Options for listing Events
 */
export interface ListEventsOptions {
  /**
   * The cursor to paginate through the results
   */
  cursor?: string;
  /**
   * The number of results to return
   */
  limit?: number;
  /**
   * The types of events to filter by
   */
  types?: EventType[];
}

/**
 * Client for managing Events
 */
export class EventsClient extends WebsetsBaseClient {
  /**
   * Initialize a new Events client
   * @param client The Exa client instance
   */
  constructor(client: Exa) {
    super(client);
  }

  /**
   * List all Events
   * @param options Optional filtering and pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Events
   */
  async list(
    options?: ListEventsOptions,
    requestOptions?: RequestOptions
  ): Promise<ListEventsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      types: options?.types,
    };

    return scoped.request<ListEventsResponse>(
      "/v0/events",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Get an Event by ID
   * @param id The ID of the Event
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Event
   */
  async get(id: string, requestOptions?: RequestOptions): Promise<Event> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Event>(`/v0/events/${id}`, "GET");
  }

  /**
   * Iterate through all Events, handling pagination automatically
   * @param options Filtering and pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Events
   */
  async *listAll(
    options?: ListEventsOptions,
    requestOptions?: RequestOptions
  ): AsyncGenerator<Event> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list(pageOptions);

      for (const event of response.data) {
        yield event;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all Events into an array
   * @param options Filtering and pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Events
   */
  async getAll(
    options?: ListEventsOptions,
    requestOptions?: RequestOptions
  ): Promise<Event[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const events: Event[] = [];
    for await (const event of scoped.listAll(options)) {
      events.push(event);
    }
    return events;
  }
}
