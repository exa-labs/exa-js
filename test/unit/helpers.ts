import { WebsetsBaseClient } from "../../src/websets/base";
import { WebsetsClient } from "../../src/websets/client";
import { WebsetEnrichmentsClient } from "../../src/websets/enrichments";
import { EventsClient } from "../../src/websets/events";
import { WebsetItemsClient } from "../../src/websets/items";
import {
  WebsetMonitorRunsClient,
  WebsetMonitorsClient,
} from "../../src/websets/monitors";
import { WebsetSearchesClient } from "../../src/websets/searches";
import { WebsetWebhooksClient } from "../../src/websets/webhooks";

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
    | WebsetMonitorsClient
    | WebsetMonitorRunsClient
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
    | WebsetMonitorsClient
    | WebsetMonitorRunsClient
    | WebsetWebhooksClient
    | EventsClient
) {
  return client;
}
