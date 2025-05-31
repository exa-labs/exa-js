import { WebsetsBaseClient } from "../src/websets/base";
import { WebsetsClient } from "../src/websets/client";
import { WebsetEnrichmentsClient } from "../src/websets/enrichments";
import { EventsClient } from "../src/websets/events";
import { WebsetItemsClient } from "../src/websets/items";
import { WebsetSearchesClient } from "../src/websets/searches";
import {
  WebsetStreamRunsClient,
  WebsetStreamsClient,
} from "../src/websets/streams";
import { WebsetWebhooksClient } from "../src/websets/webhooks";

/**
 * Helper type that exposes protected members for testing
 */
type WithProtectedAccess<T> = T & {
  // Add access to the protected request method
  request: WebsetsBaseClient["request"];
};

/**
 * Get safe access to the protected request method for testing
 * This avoids using 'as any' in tests
 */
export function getProtectedClient<
  T extends
    | WebsetsClient
    | WebsetItemsClient
    | WebsetSearchesClient
    | WebsetEnrichmentsClient
    | WebsetStreamsClient
    | WebsetStreamRunsClient
    | WebsetWebhooksClient
    | EventsClient,
>(client: T): WithProtectedAccess<T> {
  return client as WithProtectedAccess<T>;
}

/**
 * Helper function to get the protected client instance for testing
 */
export function getProtectedClientInstance(
  client:
    | WebsetsClient
    | WebsetItemsClient
    | WebsetSearchesClient
    | WebsetEnrichmentsClient
    | WebsetStreamsClient
    | WebsetStreamRunsClient
    | WebsetWebhooksClient
    | EventsClient
) {
  return client;
}
