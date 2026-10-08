/**
 * Local fake API server for offline integration tests.
 *
 * Serves `POST /search`, `POST /findSimilar` and `POST /contents` over real
 * HTTP on a loopback port, so the SDK's whole transport (URL building,
 * headers, JSON encoding, status handling, response parsing) runs as it does
 * against the hosted API.
 *
 * The server is honest about requests and deliberately simple about results:
 *
 * - It checks the `x-api-key` header and answers a missing or wrong key with
 *   the API's error shape (`requestId`, `error`, `tag`).
 * - It parses every request body against the documented request schema and
 *   answers a malformed one with `400 INVALID_REQUEST_BODY`. It is stricter
 *   than the hosted API in one way: unknown fields are rejected instead of
 *   ignored, so a misspelled or mis-cased option fails loudly.
 * - It honours the contents options a request asks for (text and its
 *   `maxCharacters`, highlights, summary, context, livecrawl statuses), and
 *   returns no contents that were not requested.
 * - Every query returns the same deterministic fixture documents. Results
 *   have the shape of real responses, not their relevance or freshness.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

export const FAKE_API_KEY = "offline-integration-test-key";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** A request the API refuses, rendered as `{ requestId, error, tag }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly tag: string,
    message: string
  ) {
    super(message);
  }
}

/** The 400 the API returns for a body that fails schema validation. */
function invalidBody(message: string): ApiError {
  return new ApiError(
    400,
    "INVALID_REQUEST_BODY",
    `Invalid request body | Validation error: ${message}`
  );
}

// ---------------------------------------------------------------------------
// Request parsing
//
// A parser returns its input typed as `T`, or throws `invalidBody` when the
// input does not match. `path` names the field in error messages, e.g.
// `contents.text.maxCharacters`. Composed parsers (`object`, `listOf`,
// `anyOf`) carry the parsed types forward, so handlers read typed bodies.
// ---------------------------------------------------------------------------

type Parser<T> = (value: unknown, path: string) => T;
type Parsed<P> = P extends Parser<infer T> ? T : never;

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function fail(path: string, expected: string, value: unknown): ApiError {
  return invalidBody(
    `Invalid input: expected ${expected}, received ${describeValue(value)} at "${path}"`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString: Parser<string> = (value, path) => {
  if (typeof value !== "string") throw fail(path, "string", value);
  return value;
};

const isNonEmptyString: Parser<string> = (value, path) => {
  const text = isString(value, path);
  if (text.trim() === "") {
    throw invalidBody(`Too small: expected a non-empty string at "${path}"`);
  }
  return text;
};

const isBoolean: Parser<boolean> = (value, path) => {
  if (typeof value !== "boolean") throw fail(path, "boolean", value);
  return value;
};

const isObject: Parser<Record<string, unknown>> = (value, path) => {
  if (!isRecord(value)) throw fail(path, "object", value);
  return value;
};

const isHttpUrl: Parser<string> = (value, path) => {
  const text = isString(value, path);
  let protocol: string;
  try {
    protocol = new URL(text).protocol;
  } catch {
    throw invalidBody(`Invalid URL at "${path}"`);
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw invalidBody(`Invalid URL at "${path}"`);
  }
  return text;
};

/** An integer within the inclusive bounds. */
function integer(minimum?: number, maximum?: number): Parser<number> {
  return (value, path) => {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw fail(path, "integer", value);
    }
    if (minimum !== undefined && value < minimum) {
      throw invalidBody(
        `Too small: expected number to be >=${minimum} at "${path}"`
      );
    }
    if (maximum !== undefined && value > maximum) {
      throw invalidBody(
        `Too big: expected number to be <=${maximum} at "${path}"`
      );
    }
    return value;
  };
}

function oneOf<const C extends readonly string[]>(
  ...choices: C
): Parser<C[number]> {
  const isChoice = (value: unknown): value is C[number] =>
    typeof value === "string" && choices.includes(value);
  return (value, path) => {
    if (!isChoice(value)) {
      const options = choices.map((choice) => `"${choice}"`).join("|");
      throw invalidBody(
        `Invalid option: expected one of ${options} at "${path}"`
      );
    }
    return value;
  };
}

function listOf<T>(item: Parser<T>, { nonEmpty = false } = {}): Parser<T[]> {
  return (value, path) => {
    if (!Array.isArray(value)) throw fail(path, "array", value);
    if (nonEmpty && value.length === 0) {
      throw invalidBody(`Too small: expected a non-empty array at "${path}"`);
    }
    return value.map((element, index) => item(element, `${path}.${index}`));
  };
}

/** Accepts a value either parser accepts; reports the second failure. */
function anyOf<A, B>(first: Parser<A>, second: Parser<B>): Parser<A | B> {
  return (value, path) => {
    try {
      return first(value, path);
    } catch {
      return second(value, path);
    }
  };
}

function join(path: string, name: string): string {
  return path ? `${path}.${name}` : name;
}

type Fields = Record<string, Parser<unknown>>;

/** An object of `fields`, all optional except `required`. */
type ParsedObject<F extends Fields, R extends keyof F> = {
  [K in keyof F]?: Parsed<F[K]>;
} & { [K in R]-?: Parsed<F[K]> };

/** An object with only the given fields, each matching its parser. */
function object<F extends Fields, R extends keyof F & string = never>(
  fields: F,
  required: readonly R[] = []
): Parser<ParsedObject<F, R>> {
  return (value, path) => {
    const record = isObject(value, path || "body");
    for (const name of required) {
      if (!(name in record)) {
        throw invalidBody(
          `Invalid input: expected value, received undefined at "${join(path, name)}"`
        );
      }
    }
    const parsed: Record<string, unknown> = {};
    for (const [name, fieldValue] of Object.entries(record)) {
      const parser = fields[name];
      if (!parser) {
        throw invalidBody(`Unrecognized key: "${name}" at "${path || "body"}"`);
      }
      parsed[name] = parser(fieldValue, join(path, name));
    }
    // Every key was parsed by its own field parser and every required key is
    // present, which is exactly ParsedObject<F, R>.
    return parsed as ParsedObject<F, R>;
  };
}

const positiveInt = integer(1);
const nonNegativeInt = integer(0);
const stringList = listOf(isString);

const SECTION = oneOf(
  "unspecified",
  "header",
  "navigation",
  "banner",
  "body",
  "sidebar",
  "footer",
  "metadata"
);
const LIVECRAWL = oneOf("never", "fallback", "always", "auto", "preferred");
const SEARCH_TYPE = oneOf(
  "neural",
  "keyword",
  "auto",
  "hybrid",
  "fast",
  "instant",
  "deep-lite",
  "deep",
  "deep-reasoning"
);
const CATEGORY = oneOf(
  "company",
  "news",
  "publication",
  "personal site",
  "financial report",
  "people"
);
type Category = Parsed<typeof CATEGORY>;

const TEXT_OPTIONS = anyOf(
  isBoolean,
  object({
    maxCharacters: positiveInt,
    includeHtmlTags: isBoolean,
    verbosity: oneOf("compact", "standard", "full"),
    includeSections: listOf(SECTION),
    excludeSections: listOf(SECTION),
  })
);
const HIGHLIGHTS_OPTIONS = anyOf(
  isBoolean,
  object({
    query: isString,
    maxCharacters: positiveInt,
    dynamic: isBoolean,
    numSentences: positiveInt,
    highlightsPerUrl: positiveInt,
  })
);
const SUMMARY_OPTIONS = anyOf(
  isBoolean,
  object({ query: isString, schema: isObject })
);
const CONTEXT_OPTIONS = anyOf(
  isBoolean,
  object({ maxCharacters: positiveInt })
);

const CONTENTS_FIELDS = {
  text: TEXT_OPTIONS,
  highlights: HIGHLIGHTS_OPTIONS,
  summary: SUMMARY_OPTIONS,
  context: CONTEXT_OPTIONS,
  metadata: anyOf(isBoolean, isObject),
  livecrawl: LIVECRAWL,
  livecrawlTimeout: nonNegativeInt,
  maxAgeHours: integer(-1),
  snapshotAsOf: isString,
  filterEmptyResults: isBoolean,
  subpages: nonNegativeInt,
  subpageTarget: anyOf(isString, stringList),
  extras: object({ links: nonNegativeInt, imageLinks: nonNegativeInt }),
};

// The API requires `contents` to be an object: `contents: false` is refused,
// so a client must omit the field to ask for no contents.
const CONTENTS_OPTIONS = object(CONTENTS_FIELDS);
type ContentsOptions = Parsed<typeof CONTENTS_OPTIONS>;

const FILTER_FIELDS = {
  numResults: integer(1, 100),
  includeDomains: stringList,
  excludeDomains: stringList,
  includeText: stringList,
  excludeText: stringList,
  startCrawlDate: isString,
  endCrawlDate: isString,
  startPublishedDate: isString,
  endPublishedDate: isString,
  category: CATEGORY,
  flags: stringList,
  userLocation: isString,
  contents: CONTENTS_OPTIONS,
};

const SEARCH_REQUEST = object(
  {
    query: isNonEmptyString,
    type: SEARCH_TYPE,
    additionalQueries: stringList,
    useAutoprompt: isBoolean,
    moderation: isBoolean,
    systemPrompt: isString,
    outputSchema: isObject,
    ...FILTER_FIELDS,
  },
  ["query"]
);
const FIND_SIMILAR_REQUEST = object(
  { url: isHttpUrl, excludeSourceDomain: isBoolean, ...FILTER_FIELDS },
  ["url"]
);
const CONTENTS_REQUEST = object({
  urls: listOf(isNonEmptyString, { nonEmpty: true }),
  ids: listOf(isNonEmptyString, { nonEmpty: true }),
  flags: stringList,
  ...CONTENTS_FIELDS,
});

/**
 * The API refuses `livecrawl` with `maxAgeHours` (livecrawl is deprecated in
 * its favour), with this tag and message.
 */
function checkFreshnessOptions(options: ContentsOptions): void {
  if (options.livecrawl !== undefined && options.maxAgeHours !== undefined) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "Cannot set both 'livecrawl' and 'maxAgeHours'. Use 'maxAgeHours' instead (livecrawl is deprecated)."
    );
  }
}

// ---------------------------------------------------------------------------
// Fixture documents
// ---------------------------------------------------------------------------

const SENTENCES = [
  "This fixture document stands in for a crawled web page.",
  "Its text is long enough to exercise character limits on returned contents.",
  "Every sentence is deterministic, so test runs are reproducible.",
  "Highlights and summaries are drawn from these same sentences.",
  "Nothing here depends on the network or on live data.",
];

/** One fixture web page. */
type FixtureDocument = {
  url: string;
  title: string;
  author: string;
  publishedDate: string;
  text: string;
};

/** A deterministic document of roughly 12,000 characters. */
function makeDocument(
  url: string,
  title: string,
  index: number
): FixtureDocument {
  const lines = [title];
  let length = title.length + 1;
  for (let paragraph = 1; length < 12_000; paragraph++) {
    const line = `Paragraph ${paragraph} of document ${index}. ${
      SENTENCES[paragraph % SENTENCES.length]
    }`;
    lines.push(line);
    length += line.length + 1;
  }
  return {
    url,
    title,
    author: `Fixture Author ${index}`,
    publishedDate: `2024-01-${String(index).padStart(2, "0")}T00:00:00.000Z`,
    text: lines.join("\n"),
  };
}

const DOCUMENTS: FixtureDocument[] = Array.from({ length: 12 }, (_, i) =>
  makeDocument(
    `https://site-${i + 1}.example.com/articles/${i + 1}`,
    `Fixture Document ${i + 1}`,
    i + 1
  )
);

/** The host of `url`, or the raw string when it does not parse. */
function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

/** The fixture document at `url`, or a deterministic one made for it. */
function documentForUrl(url: string): FixtureDocument {
  return (
    DOCUMENTS.find((document) => document.url === url) ??
    makeDocument(url, `Fixture page for ${hostOf(url)}`, 0)
  );
}

// ---------------------------------------------------------------------------
// Response rendering
// ---------------------------------------------------------------------------

type HighlightsOptions = Parsed<typeof HIGHLIGHTS_OPTIONS>;
type SummaryOptions = Parsed<typeof SUMMARY_OPTIONS>;

/** Truncates `value` to `options.maxCharacters` when an object sets it. */
function limit(
  value: string,
  options: boolean | { maxCharacters?: number }
): string {
  if (typeof options === "object" && options.maxCharacters !== undefined) {
    return value.slice(0, options.maxCharacters);
  }
  return value;
}

function renderHighlights(
  document: FixtureDocument,
  options: HighlightsOptions
): string[] {
  const settings = typeof options === "object" ? options : {};
  const count = settings.highlightsPerUrl ?? 1;
  const width = settings.numSentences ?? 2;
  const sentences = document.text.split("\n").slice(1);
  return Array.from({ length: count }, (_, i) =>
    limit(sentences.slice(i * width, (i + 1) * width).join(" "), settings)
  );
}

function renderSummary(
  document: FixtureDocument,
  options: SummaryOptions
): string {
  const query = typeof options === "object" ? options.query : undefined;
  let summary = `Summary of ${document.title}: a deterministic fixture page used by offline tests.`;
  if (query) summary += ` It answers the question: ${query}`;
  return summary;
}

/** A current role (open-ended, `to` is null) and a finished one. */
function renderWorkHistory(index: number): JsonObject[] {
  return [
    {
      title: "Software Engineer",
      location: "Example City",
      dates: { from: `2024-${String(index).padStart(2, "0")}-01`, to: null },
      company: {
        id: "https://example.com/company/current",
        name: "Current Fixture Company",
      },
    },
    {
      title: "Software Engineer Intern",
      location: null,
      dates: { from: "2022-06-01", to: "2022-09-01" },
      company: { id: null, name: "Previous Fixture Company" },
    },
  ];
}

/** Company or person entities, which the API returns only for those categories. */
function renderEntities(
  document: FixtureDocument,
  index: number,
  category: Category | undefined
): JsonObject[] | undefined {
  if (category === "company") {
    return [
      {
        id: document.url,
        type: "company",
        version: 1,
        properties: {
          name: `Fixture Company ${index}`,
          foundedYear: 2000 + index,
          description: "A fixture company used by offline tests.",
          workforce: { total: 10 * index },
          headquarters: {
            address: `${index} Example Street`,
            city: "Example City",
            postalCode: null,
            country: "United States",
          },
          financials: {
            revenueAnnual: null,
            fundingTotal: 1_000_000 * index,
            fundingLatestRound: {
              name: "Seed",
              date: "2024-01-01",
              amount: 1_000_000,
            },
          },
          webTraffic: { visitsMonthly: 1000 * index },
        },
      },
    ];
  }
  if (category === "people") {
    return [
      {
        id: document.url,
        type: "person",
        version: 1,
        properties: {
          name: `Fixture Person ${index}`,
          location: "Example City",
          workHistory: renderWorkHistory(index),
        },
      },
    ];
  }
  return undefined;
}

/** One rendered result: the JSON body plus the fields `renderContext` reads. */
type RenderedResult = {
  body: JsonObject;
  title: string;
  url: string;
  text?: string;
};

/** One result with exactly the contents `contents` asks for. */
function renderResult(
  document: FixtureDocument,
  contents: ContentsOptions,
  {
    index,
    score,
    category,
  }: { index: number; score?: number; category?: Category }
): RenderedResult {
  const body: JsonObject = {
    id: document.url,
    url: document.url,
    title: document.title,
    author: document.author,
    publishedDate: document.publishedDate,
  };
  if (score !== undefined) body.score = score;
  let text: string | undefined;
  if (contents.text) {
    text = limit(document.text, contents.text);
    body.text = text;
  }
  if (contents.highlights) {
    const highlights = renderHighlights(document, contents.highlights);
    body.highlights = highlights;
    body.highlightScores = highlights.map((_, i) => 0.9 - 0.1 * i);
  }
  if (contents.summary) {
    body.summary = renderSummary(document, contents.summary);
  }
  const entities = renderEntities(document, index, category);
  if (entities) body.entities = entities;
  return { body, title: document.title, url: document.url, text };
}

/** The deprecated combined context string built from the results. */
function renderContext(
  results: RenderedResult[],
  options: boolean | { maxCharacters?: number }
): string {
  const blocks = results.map((result) => {
    let block = `Title: ${result.title}\nURL: ${result.url}\n`;
    if (result.text !== undefined) block += `${result.text}\n`;
    return block;
  });
  return limit(blocks.join("\n"), options);
}

function requestId(): string {
  return randomBytes(16).toString("hex");
}

/** The response body shared by `/search` and `/findSimilar`. */
function searchResponse(
  documents: FixtureDocument[],
  category: Category | undefined,
  contents: ContentsOptions,
  searchType: string | undefined
): JsonObject {
  const results = documents.map((document, i) =>
    renderResult(document, contents, {
      index: i + 1,
      score: Math.round((0.99 - 0.01 * (i + 1)) * 100) / 100,
      category,
    })
  );
  const response: JsonObject = {
    requestId: requestId(),
    results: results.map((result) => result.body),
    searchTime: 1.0,
    costDollars: { total: 0.005 },
  };
  if (searchType !== undefined) {
    response.resolvedSearchType = searchType === "auto" ? "neural" : searchType;
  }
  if (contents.context) {
    response.context = renderContext(results, contents.context);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Endpoints: each parses a raw JSON body and returns a response body.
// ---------------------------------------------------------------------------

function handleSearch(raw: unknown): JsonObject {
  const body = SEARCH_REQUEST(raw, "");
  const contents = body.contents ?? {};
  checkFreshnessOptions(contents);
  return searchResponse(
    DOCUMENTS.slice(0, body.numResults ?? 10),
    body.category,
    contents,
    body.type ?? "auto"
  );
}

function handleFindSimilar(raw: unknown): JsonObject {
  const body = FIND_SIMILAR_REQUEST(raw, "");
  const contents = body.contents ?? {};
  checkFreshnessOptions(contents);
  const sourceHost = hostOf(body.url);
  const candidates = DOCUMENTS.filter(
    (document) =>
      document.url !== body.url &&
      !(body.excludeSourceDomain && hostOf(document.url) === sourceHost)
  );
  return searchResponse(
    candidates.slice(0, body.numResults ?? 10),
    body.category,
    contents,
    undefined
  );
}

function handleContents(raw: unknown): JsonObject {
  const {
    urls: requestedUrls,
    ids,
    flags: _flags,
    ...options
  } = CONTENTS_REQUEST(raw, "");
  checkFreshnessOptions(options);
  const urls = requestedUrls ?? ids;
  if (!urls) {
    throw invalidBody(
      'Invalid input: expected array, received undefined at "urls"'
    );
  }
  // Without any contents option the endpoint returns full text.
  const contents: ContentsOptions =
    options.text === undefined &&
    options.highlights === undefined &&
    options.summary === undefined
      ? { ...options, text: true }
      : options;
  const crawled =
    options.livecrawl === "always" ||
    options.livecrawl === "preferred" ||
    options.maxAgeHours === 0;
  const results = urls.map((url, i) =>
    renderResult(documentForUrl(url), contents, { index: i + 1 })
  );
  const response: JsonObject = {
    requestId: requestId(),
    results: results.map((result) => result.body),
    statuses: urls.map((url) => ({
      id: url,
      status: "success",
      source: crawled ? "crawled" : "cached",
    })),
    costDollars: { total: 0.001 * urls.length },
  };
  if (contents.context) {
    response.context = renderContext(results, contents.context);
  }
  return response;
}

const ROUTES: Record<string, (raw: unknown) => JsonObject> = {
  "/search": handleSearch,
  "/findSimilar": handleFindSimilar,
  "/contents": handleContents,
};

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function sameKey(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The key from `x-api-key: <key>` or `Authorization: Bearer <key>`. */
function presentedKey(headers: IncomingHttpHeaders): string | undefined {
  const header = headers["x-api-key"];
  const apiKey = Array.isArray(header) ? header[0] : header;
  if (apiKey !== undefined) return apiKey;
  const authorization = headers.authorization ?? "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length)
    : undefined;
}

function authenticate(headers: IncomingHttpHeaders, apiKey: string): void {
  const presented = presentedKey(headers);
  if (!presented) {
    // The hosted API answers a keyless request with a payment-required
    // challenge; the fake keeps its status, tag and message.
    throw new ApiError(
      402,
      "X402_PAYMENT_REQUIRED",
      "Payment required to access this resource"
    );
  }
  if (!sameKey(presented, apiKey)) {
    throw new ApiError(
      401,
      "INVALID_API_KEY",
      "Invalid API key. Provide a valid key using 'Authorization: Bearer <key>' or 'x-api-key: <key>'."
    );
  }
}

/** Routes one request and returns its response body, or throws `ApiError`. */
export function dispatch(
  method: string,
  path: string,
  headers: IncomingHttpHeaders,
  rawBody: string,
  apiKey: string
): JsonObject {
  const route = ROUTES[new URL(path, "http://localhost").pathname];
  if (method !== "POST" || !route) {
    throw new ApiError(404, "NOT_FOUND", "Not found");
  }
  authenticate(headers, apiKey);
  let body: unknown;
  try {
    body = JSON.parse(rawBody || "null");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw invalidBody(`Malformed JSON: ${reason}`);
  }
  return route(body);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function respond(
  request: IncomingMessage,
  response: ServerResponse,
  apiKey: string
): Promise<void> {
  let status = 200;
  let payload: JsonObject;
  try {
    const rawBody = await readBody(request);
    payload = dispatch(
      request.method ?? "",
      request.url ?? "/",
      request.headers,
      rawBody,
      apiKey
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    status = error.status;
    payload = { requestId: requestId(), error: error.message, tag: error.tag };
  }
  const encoded = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(encoded),
  });
  response.end(encoded);
}

/** A running fake API server; `url` is the base URL to give the client. */
export type FakeApi = {
  url: string;
  apiKey: string;
  close: () => Promise<void>;
};

/** Starts the fake API server on `host`, on a free port unless `port` is given. */
export async function startFakeApi({
  apiKey = FAKE_API_KEY,
  host = "127.0.0.1",
  port = 0,
}: { apiKey?: string; host?: string; port?: number } = {}): Promise<FakeApi> {
  const server = createServer((request, response) => {
    respond(request, response, apiKey).catch((error: unknown) => {
      // An unexpected failure is a bug in the fake: answer 500 and keep the
      // cause visible in the test output.
      console.error(error);
      response.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(
        JSON.stringify({
          requestId: requestId(),
          error: String(error),
          tag: "INTERNAL_ERROR",
        })
      );
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Fake API server is not listening on a TCP port");
  }
  return {
    url: `http://${host}:${address.port}`,
    apiKey,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
