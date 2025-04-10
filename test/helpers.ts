import { WebsetsBaseClient } from "../src/websets/base";
import { WebsetsClient } from "../src/websets/client";
import { WebsetEnrichmentsClient } from "../src/websets/enrichments";
import { WebsetItemsClient } from "../src/websets/items";
import { WebsetSearchesClient } from "../src/websets/searches";
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
    | WebsetWebhooksClient
>(client: T): WithProtectedAccess<T> {
  return client as WithProtectedAccess<T>;
}
