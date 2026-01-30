import { Exa } from "../index";
import { WebsetsBaseClient } from "./base";
import { Event, EventType, ListEventsResponse } from "./openapi";

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
   * @returns The list of Events
   */
  async list(options?: ListEventsOptions): Promise<ListEventsResponse> {
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      types: options?.types,
    };

    return this.request<ListEventsResponse>(
      "/v0/events",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Get an Event by ID
   * @param id The ID of the Event
   * @returns The Event
   */
  async get(id: string): Promise<Event> {
    return this.request<Event>(`/v0/events/${id}`, "GET");
  }

  /**
   * Iterate through all Events, handling pagination automatically
   * @param options Filtering and pagination options
   * @returns Async generator of Events
   */
  async *listAll(options?: ListEventsOptions): AsyncGenerator<Event> {
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(pageOptions);

      for (const event of response.data) {
        yield event;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect all Events into an array
   * @param options Filtering and pagination options
   * @returns Promise resolving to an array of all Events
   */
  async getAll(options?: ListEventsOptions): Promise<Event[]> {
    const events: Event[] = [];
    for await (const event of this.listAll(options)) {
      events.push(event);
    }
    return events;
  }
}
