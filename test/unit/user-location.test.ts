/**
 * `userLocation` tells the API where the end user is: a country code, or an
 * object with `country` and/or `latitude` + `longitude`. These tests check
 * the shapes the `UserLocation` type admits, and that every method that calls
 * `/search` or `/answer` sends each form unchanged as a top-level body field
 * and leaves it out when not given. They make no HTTP calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa, { type UserLocation } from "../../src";

const COORDINATES = { latitude: 37.7749, longitude: -122.4194 };

const SEARCH_RESPONSE = { results: [], requestId: "req-123" };
const ANSWER_RESPONSE = { answer: "No", citations: [], requestId: "req-1" };

/** Every accepted form, labelled for test names. */
const FORMS: [string, UserLocation][] = [
  ["a country code", "US"],
  ["a country object", { country: "US" }],
  ["coordinates", COORDINATES],
  ["coordinates with a country", { country: "US", ...COORDINATES }],
];

function emptySseResponse(): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } }
  );
}

/** The JSON body of the nth call to a `request`/`rawRequest` spy. */
function bodyOf(
  spy: { mock: { calls: unknown[][] } },
  call = 0
): Record<string, unknown> {
  return spy.mock.calls[call][2] as Record<string, unknown>;
}

describe("UserLocation", () => {
  it("types latitude and longitude as required together", () => {
    // The type checker refuses each of these. At runtime they are plain values.
    const refused: UserLocation[] = [
      // @ts-expect-error a latitude without a longitude
      { country: "US", latitude: COORDINATES.latitude },
      // @ts-expect-error a longitude without a latitude
      { country: "US", longitude: COORDINATES.longitude },
      // @ts-expect-error a latitude alone
      { latitude: COORDINATES.latitude },
      // @ts-expect-error neither a country nor coordinates
      {},
    ];
    expect(refused).toHaveLength(4);
  });
});

describe("userLocation", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it.each(FORMS)(
    "search sends %s at the top level of the /search body",
    async (_form, userLocation) => {
      const requestSpy = vi
        .spyOn(exa, "request")
        .mockResolvedValue(SEARCH_RESPONSE);

      await exa.search("weather today", { userLocation, contents: false });
      await exa.search("weather today", { contents: false });

      expect(requestSpy).toHaveBeenNthCalledWith(1, "/search", "POST", {
        query: "weather today",
        userLocation,
      });
      expect(bodyOf(requestSpy, 1)).not.toHaveProperty("userLocation");
    }
  );

  it("search sends it with a deep search type", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(SEARCH_RESPONSE);

    await exa.search("restaurants nearby", {
      type: "deep",
      userLocation: COORDINATES,
    });

    expect(bodyOf(requestSpy)).toMatchObject({
      query: "restaurants nearby",
      type: "deep",
      userLocation: COORDINATES,
    });
  });

  it("streamSearch sends it in the streaming /search body", async () => {
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(emptySseResponse());

    for await (const _chunk of exa.streamSearch("weather today", {
      userLocation: COORDINATES,
    })) {
      // drain
    }

    expect(rawRequestSpy.mock.calls[0][0]).toBe("/search");
    expect(bodyOf(rawRequestSpy)).toMatchObject({
      userLocation: COORDINATES,
      stream: true,
    });
  });

  it("searchAndContents keeps it at the top level, outside contents", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(SEARCH_RESPONSE);

    await exa.searchAndContents("weather today", {
      text: true,
      userLocation: COORDINATES,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "weather today",
      contents: { text: true },
      userLocation: COORDINATES,
    });
  });

  it.each(FORMS)(
    "answer sends %s in the /answer body",
    async (_form, userLocation) => {
      const requestSpy = vi
        .spyOn(exa, "request")
        .mockResolvedValue(ANSWER_RESPONSE);

      await exa.answer("Is it raining?", { userLocation });
      await exa.answer("Is it raining?");

      expect(requestSpy.mock.calls[0][0]).toBe("/answer");
      expect(bodyOf(requestSpy)).toMatchObject({
        query: "Is it raining?",
        userLocation,
      });
      // An omitted field is undefined, which JSON.stringify drops from the body.
      expect(bodyOf(requestSpy, 1).userLocation).toBeUndefined();
    }
  );

  it("streamAnswer sends it in the streaming /answer body", async () => {
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(emptySseResponse());

    for await (const _chunk of exa.streamAnswer("Is it raining?", {
      userLocation: COORDINATES,
    })) {
      // drain
    }

    expect(rawRequestSpy.mock.calls[0][0]).toBe("/answer");
    expect(bodyOf(rawRequestSpy)).toMatchObject({
      userLocation: COORDINATES,
      stream: true,
    });
  });
});
