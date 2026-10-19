/**
 * Per-call options for Exa API requests, and the machinery that applies them
 * to a `fetch` call.
 *
 * - `RequestOptions`: what every API method takes as its trailing argument.
 *   `TransportRequestOptions` is its `signal` / `timeout` part, which the
 *   search, contents and answer methods also accept inside their options bag.
 * - `omitRequestOptions` / `pickRequestOptions` / `mergeRequestOptions`: keep
 *   those fields out of JSON bodies and combine the places they can be given.
 * - `mergeRequestBody` / `mergeRequestHeaders`: add a call's extra `body` and
 *   `headers` to the request a method built.
 * - `resolveRequestSignal`: one fetch-ready signal per request, plus the
 *   mapping from a fetch rejection to `ExaAbortError` / `ExaTimeoutError`.
 * - `withDisposeOnBodySettled`: holds request-owned listeners and timers until
 *   the response body settles.
 * - `RequestScopedClient`: lets an API sub-client run a method's requests
 *   with the caller's transport options.
 * - `sleep`: an abortable delay for polling helpers.
 */
import { ExaAbortError, ExaError, ExaTimeoutError } from "./errors";

/**
 * Transport-level options for a single request.
 *
 * These are never serialized into JSON request bodies. They only control the
 * underlying `fetch` call (cancellation and timeouts).
 */
export type TransportRequestOptions = {
  /**
   * AbortSignal used to cancel the in-flight HTTP request, for stale UI
   * requests or navigation changes. Aborting it rejects the call with
   * `ExaAbortError` whatever the reason, `AbortSignal.timeout()` included.
   * Use `timeout` to get `ExaTimeoutError`.
   */
  signal?: AbortSignal | undefined;

  /**
   * Request timeout in milliseconds. When it expires, the call rejects with
   * `ExaTimeoutError`. It is a deadline for the whole response, body
   * included, counted from when the request is sent. A streaming method
   * applies it to the wait for a successful response to start, never to a
   * stream that is flowing. An error response is read whole within it.
   * Left unset (`undefined`, or `null` from JavaScript), the client's default
   * timeout applies.
   *
   * If both `timeout` and `signal` are provided, the request aborts when either
   * fires first.
   */
  timeout?: number | undefined;
};

/** Query parameter values the SDK can serialize into a URL. */
export type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

/**
 * Per-call options every API method accepts as its trailing argument.
 *
 * `signal` and `timeout` control the `fetch` call. `body`, `headers` and
 * `query` add to the request the method builds, for fields the SDK does not
 * type yet. On a name the method also sets, the value given here wins.
 */
export type RequestOptions = TransportRequestOptions & {
  /**
   * Extra fields merged over the JSON request body, except `stream`, because
   * the method called decides whether the response streams. Sent with `POST`,
   * `PUT` and `PATCH` requests. Other requests take `query` instead.
   */
  body?: Record<string, unknown> | undefined;

  /**
   * Extra headers. A header the SDK also sets is replaced, whatever its case.
   * `null` removes it and `undefined` leaves it as it is. The Agent run
   * streams send `Accept: text/event-stream` and keep it, ignoring an extra
   * `Accept`. Every other method, the other streaming methods included, sends
   * an extra `Accept` as given.
   */
  headers?: Record<string, string | null | undefined> | undefined;

  /**
   * Extra query parameters merged over the request's query string, except
   * `stream`. A parameter set to `undefined` is skipped. A `cursor` given to
   * a helper that pages through a listing selects its first page only.
   */
  query?: QueryParams | undefined;
};

/**
 * Result of resolving transport options into a fetch-ready AbortSignal.
 *
 * Call `dispose()` once the request settles (success, failure, or stream end)
 * so signal listeners and timeout timers are released.
 */
export type ResolvedRequestSignal = {
  signal: AbortSignal | undefined;
  dispose: () => void;
  /**
   * True when `dispose()` releases listeners or timers. False when no
   * request-owned resources need body-lifetime bookkeeping.
   */
  needsDispose: boolean;
  /**
   * Stops the timeout and leaves the caller's signal attached. Streaming
   * calls use it once response headers arrive, so `timeout` bounds the wait
   * for a stream to start and never cuts one that is already flowing.
   */
  stopTimeout: () => void;
  /**
   * Maps an error thrown by `fetch` or a body read to `ExaTimeoutError` or
   * `ExaAbortError` when this request's timeout or signal caused it. Any
   * other error, and any `ExaError`, is returned unchanged.
   */
  toRequestError: (error: unknown, path?: string) => unknown;
};

/** Largest delay a timer accepts: Node timers overflow above 2^31-1 ms. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Checks that a timeout is a whole number of milliseconds a timer can hold.
 * @throws {RangeError} When it is not an integer from 1 to 2147483647.
 */
export function validateTimeout(timeout: number): number {
  if (
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > MAX_TIMEOUT_MS
  ) {
    throw new RangeError(
      `Request timeout must be an integer from 1 to ${MAX_TIMEOUT_MS} milliseconds (received ${timeout})`
    );
  }
  return timeout;
}

const REQUEST_OPTION_KEYS = ["signal", "timeout"] as const;

/**
 * Removes transport-only fields so they are never serialized into API payloads.
 */
export function omitRequestOptions<T extends object>(
  options?: T
): Omit<T, keyof TransportRequestOptions> | undefined {
  if (options == null) {
    return undefined;
  }

  const rest = { ...options } as Record<string, unknown>;
  for (const key of REQUEST_OPTION_KEYS) {
    delete rest[key];
  }
  return rest as Omit<T, keyof TransportRequestOptions>;
}

/**
 * Extracts the transport options (`signal`, `timeout`) from a mixed options
 * bag. A bag's other keys belong to the API payload, so a key that happens to
 * be named `body`, `headers` or `query` is never read as a request option.
 */
export function pickRequestOptions(
  options?: TransportRequestOptions | null
): TransportRequestOptions | undefined {
  if (options == null) {
    return undefined;
  }

  const picked: TransportRequestOptions = {};
  if (options.signal !== undefined) {
    picked.signal = options.signal;
  }
  if (options.timeout !== undefined) {
    picked.timeout = options.timeout;
  }

  return picked.signal !== undefined || picked.timeout !== undefined
    ? picked
    : undefined;
}

/**
 * Merges request options given in several places into one. A later source
 * wins: `signal` and `timeout` field by field, `body`, `headers` and `query`
 * entry by entry. A field a later source leaves undefined falls through to an
 * earlier one, so a trailing `requestOptions` argument overrides the same
 * field in a method's options bag, which overrides the client default. A
 * `timeout` of `null` counts as unset too, so it never switches off the
 * client default.
 * Returns undefined when no source sets anything.
 */
export function mergeRequestOptions(
  ...sources: Array<RequestOptions | null | undefined>
): RequestOptions | undefined {
  const merged: RequestOptions = {};
  for (const source of sources) {
    if (source?.signal !== undefined) {
      merged.signal = source.signal;
    }
    if (source?.timeout != null) {
      merged.timeout = source.timeout;
    }
    if (source?.body !== undefined) {
      merged.body = { ...merged.body, ...source.body };
    }
    if (source?.headers !== undefined) {
      merged.headers = { ...merged.headers, ...source.headers };
    }
    if (source?.query !== undefined) {
      merged.query = { ...merged.query, ...source.query };
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Methods whose requests carry a JSON body, and so take the extra `body`. */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Returns the JSON body to send: the body a method built with the call's
 * extra `body` fields merged over it. `stream` is never taken from the extra
 * fields. Only `POST`, `PUT` and `PATCH` requests take them; any other
 * request is left as it is.
 * @throws {TypeError} When the method's body is not a plain object to merge into.
 */
export function mergeRequestBody(
  method: string,
  body: unknown,
  extraBody?: Record<string, unknown>
): unknown {
  if (!extraBody || !BODY_METHODS.has(method.toUpperCase())) {
    return body;
  }
  const { stream: _stream, ...extra } = extraBody;
  if (body === undefined || body === null) {
    return Object.keys(extra).length > 0 ? extra : body;
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError(
      "Cannot merge the `body` request option into a request body that is not an object"
    );
  }
  return { ...body, ...extra };
}

/**
 * Returns the query parameters to send: `query` with the call's extra
 * parameters merged over it. `stream` is never taken from the extra
 * parameters, and one set to `undefined` or `null` is skipped rather than
 * clearing the method's own. Returns `query` itself when there is nothing to
 * add.
 */
export function mergeRequestQuery(
  query: QueryParams | undefined,
  extraQuery?: QueryParams
): QueryParams | undefined {
  const extra = Object.fromEntries(
    Object.entries(extraQuery ?? {}).filter(
      ([name, value]) =>
        name !== "stream" && value !== undefined && value !== null
    )
  );
  return Object.keys(extra).length > 0 ? { ...query, ...extra } : query;
}

/** True when `headers` ask for a server-sent event stream. */
function acceptsEventStream(headers: Record<string, string>): boolean {
  return Object.entries(headers).some(
    ([name, value]) =>
      name.toLowerCase() === "accept" &&
      value.toLowerCase().includes("text/event-stream")
  );
}

/**
 * Returns the headers to send: `headers` with the call's extra headers set on
 * top. Header names are case-insensitive, so an extra header replaces every
 * header already present under any casing instead of being sent beside it.
 * An extra header set to `null` removes the header; one set to `undefined`
 * is skipped. When `headers` ask for an event stream, an extra `Accept` is
 * skipped too: the method called decides whether the response streams.
 */
export function mergeRequestHeaders(
  headers: Record<string, string>,
  extraHeaders?: Record<string, string | null | undefined>
): Record<string, string> {
  if (!extraHeaders) {
    return headers;
  }
  const keepsAccept = acceptsEventStream(headers);
  const merged = { ...headers };
  for (const [name, value] of Object.entries(extraHeaders)) {
    const lowerCaseName = name.toLowerCase();
    if (value === undefined || (keepsAccept && lowerCaseName === "accept")) {
      continue;
    }
    for (const existing of Object.keys(merged)) {
      if (existing.toLowerCase() === lowerCaseName) {
        delete merged[existing];
      }
    }
    if (value !== null) {
      merged[name] = value;
    }
  }
  return merged;
}

/** Each client's default request options (`ExaClientOptions`), by client. */
const CLIENT_DEFAULTS = new WeakMap<object, TransportRequestOptions>();

/** Records the default request options of `client`; the `Exa` constructor calls it. */
export function setClientDefaults(
  client: object,
  defaults: TransportRequestOptions | undefined
): void {
  if (defaults === undefined) {
    CLIENT_DEFAULTS.delete(client);
  } else {
    CLIENT_DEFAULTS.set(client, defaults);
  }
}

/**
 * Returns the default request options of `client` overridden by
 * `requestOptions`, or undefined when neither sets anything.
 */
export function withClientDefaults(
  client: object,
  requestOptions?: RequestOptions | null
): RequestOptions | undefined {
  return mergeRequestOptions(CLIENT_DEFAULTS.get(client), requestOptions);
}

/**
 * Builds the request options for a call that streams its response: the
 * defaults of `client` overridden by `requestOptions`, marked so `rawRequest`
 * applies `timeout` to the wait for a successful response's headers only.
 * Returns undefined when neither sets anything.
 */
export function streamRequestOptions(
  client: object,
  requestOptions?: RequestOptions | null
): RequestOptions | undefined {
  return asStreamRequestOptions(withClientDefaults(client, requestOptions));
}

/** Options whose `timeout` stops once a successful response starts. */
const STREAM_REQUEST_OPTIONS = new WeakSet<RequestOptions>();

/**
 * Marks request options as belonging to a call that streams its response.
 * `rawRequest` then stops the timeout once a successful response's headers
 * arrive, so a stream that has started is never cut by it, and reports a
 * cancelled read as `ExaAbortError`. An error response keeps the timeout until
 * its body is read. Returns undefined when there is nothing to carry, so a
 * caller can keep its original argument list.
 */
export function asStreamRequestOptions(
  options?: RequestOptions | null
): RequestOptions | undefined {
  const copy = mergeRequestOptions(options);
  if (copy) {
    STREAM_REQUEST_OPTIONS.add(copy);
  }
  return copy;
}

/** Whether `asStreamRequestOptions` produced these options. */
export function isStreamRequestOptions(
  options?: RequestOptions | null
): boolean {
  return options != null && STREAM_REQUEST_OPTIONS.has(options);
}

type DisposableAbortSignal = {
  signal: AbortSignal;
  dispose: () => void;
};

/** Shared sentinel so callers can detect "nothing to release". */
const NOOP_DISPOSE = () => {};

function createTimeoutSignal(timeoutMs: number): DisposableAbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(
      typeof DOMException !== "undefined"
        ? new DOMException(
            `The operation was aborted due to timeout after ${timeoutMs}ms`,
            "TimeoutError"
          )
        : undefined
    );
  }, timeoutMs);

  // Avoid keeping the event loop alive solely for the timer in Node.
  if (typeof (timer as NodeJS.Timeout).unref === "function") {
    (timer as NodeJS.Timeout).unref();
  }

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
  };

  controller.signal.addEventListener("abort", dispose, { once: true });

  return { signal: controller.signal, dispose };
}

function anySignal(signals: AbortSignal[]): DisposableAbortSignal {
  if (signals.length === 1) {
    return { signal: signals[0], dispose: NOOP_DISPOSE };
  }

  const controller = new AbortController();
  const abortHandlers: Array<{
    signal: AbortSignal;
    handler: () => void;
  }> = [];

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const { signal, handler } of abortHandlers) {
      signal.removeEventListener("abort", handler);
    }
    abortHandlers.length = 0;
  };

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      // Release listeners already attached to earlier signals in this loop.
      dispose();
      return { signal: controller.signal, dispose: NOOP_DISPOSE };
    }
    const handler = () => {
      controller.abort(signal.reason);
    };
    signal.addEventListener("abort", handler);
    abortHandlers.push({ signal, handler });
  }

  // Drop sibling listeners as soon as one source aborts.
  controller.signal.addEventListener("abort", dispose, { once: true });

  return { signal: controller.signal, dispose };
}

/**
 * Resolves the AbortSignal that should be passed to `fetch`.
 *
 * Combines an optional caller `signal` with an optional `timeout` so either
 * can cancel the request. Always call `dispose()` when the request settles so
 * listeners / timers are released.
 */
export function resolveRequestSignal(
  options?: TransportRequestOptions | null
): ResolvedRequestSignal {
  if (options == null) {
    return {
      signal: undefined,
      dispose: () => {},
      needsDispose: false,
      stopTimeout: NOOP_DISPOSE,
      toRequestError: (error) => error,
    };
  }

  const { signal, timeout } = options;
  const signals: AbortSignal[] = [];
  const disposers: Array<() => void> = [];
  let timeoutSignal: DisposableAbortSignal | undefined;

  if (signal) {
    signals.push(signal);
  }

  if (timeout != null) {
    timeoutSignal = createTimeoutSignal(validateTimeout(timeout));
    signals.push(timeoutSignal.signal);
    if (timeoutSignal.dispose !== NOOP_DISPOSE) {
      disposers.push(timeoutSignal.dispose);
    }
  }

  if (signals.length === 0) {
    return {
      signal: undefined,
      dispose: () => {},
      needsDispose: false,
      stopTimeout: NOOP_DISPOSE,
      toRequestError: (error) => error,
    };
  }

  const combined = anySignal(signals);
  if (combined.dispose !== NOOP_DISPOSE) {
    disposers.push(combined.dispose);
  }

  // With both a signal and a timeout, the one that fires first cancelled the
  // request; the other may still fire before the rejection is handled.
  let firstAbort: "signal" | "timeout" | undefined;
  if (signal && timeoutSignal) {
    combined.signal.addEventListener(
      "abort",
      () => {
        firstAbort = signal.aborted ? "signal" : "timeout";
      },
      { once: true }
    );
  }

  const toRequestError = (error: unknown, path?: string): unknown => {
    if (error instanceof ExaError || error instanceof ExaAbortError) {
      return error;
    }
    const abortedBy =
      firstAbort ??
      (signal?.aborted
        ? "signal"
        : timeoutSignal?.signal.aborted
          ? "timeout"
          : undefined);
    if (abortedBy === "timeout") {
      return new ExaTimeoutError(timeout as number, path, error);
    }
    if (abortedBy === "signal") {
      return new ExaAbortError(error);
    }
    return error;
  };
  const stopTimeout = timeoutSignal?.dispose ?? NOOP_DISPOSE;

  if (disposers.length === 0) {
    return {
      signal: combined.signal,
      dispose: () => {},
      needsDispose: false,
      stopTimeout,
      toRequestError,
    };
  }

  let disposed = false;
  return {
    signal: combined.signal,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const dispose of disposers) {
        dispose();
      }
    },
    needsDispose: true,
    stopTimeout,
    toRequestError,
  };
}

/**
 * Keeps transport `dispose()` alive until the response body is consumed,
 * cancelled, or errors. Disposes immediately when there is no body.
 *
 * Used by `rawRequest` so signal listeners stay attached for the
 * full fetch lifetime (headers + body), not just until headers resolve.
 *
 * `mapError` translates a failed body read before the consumer sees it; the
 * SDK's streams pass `toRequestError` so a cancelled read rejects with
 * `ExaAbortError`. It is not applied to the Node stream fallback, whose body
 * is returned as is.
 */
export function withDisposeOnBodySettled(
  response: Response,
  dispose: () => void,
  mapError: (error: unknown) => unknown = (error) => error
): Response {
  const body = response.body;
  if (!body) {
    dispose();
    return response;
  }

  // cross-fetch uses node-fetch on older Node versions, whose body is a Node
  // stream rather than a Web ReadableStream. Keep the original Response there.
  if (typeof body.getReader !== "function") {
    const nodeBody = body as unknown as NodeJS.ReadableStream;
    const settle = () => {
      nodeBody.removeListener("end", settle);
      nodeBody.removeListener("close", settle);
      nodeBody.removeListener("error", settle);
      dispose();
    };
    nodeBody.once("end", settle);
    nodeBody.once("close", settle);
    nodeBody.once("error", settle);
    return response;
  }

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    dispose();
  };

  const reader = body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          settle();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        settle();
        controller.error(mapError(error));
      }
    },
    cancel(reason) {
      settle();
      return reader.cancel(reason);
    },
  });

  // Preserve status/headers; body ownership moves to the wrapper stream.
  const wrapped = new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  // A synthetic Response otherwise loses redirect and URL metadata, including
  // on clones created by callers of the low-level rawRequest API.
  const preserveMetadata = (target: Response): Response => {
    Object.defineProperties(target, {
      url: { value: response.url },
      redirected: { value: response.redirected },
      type: { value: response.type },
    });
    const clone = target.clone.bind(target);
    Object.defineProperty(target, "clone", {
      value: () => preserveMetadata(clone()),
    });
    return target;
  };
  preserveMetadata(wrapped);

  // A reader or clone can outlive this Response. Only body settlement may
  // dispose transport resources; collecting the Response must not disable aborts.
  return wrapped;
}

/**
 * Waits `ms` milliseconds, rejecting with `ExaAbortError` as soon as `signal`
 * aborts. Polling helpers wait with it between polls so a cancelled poll does
 * not sit out its interval.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new ExaAbortError(signal.reason));
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new ExaAbortError(signal.reason));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
  });
}

/**
 * Base for the API sub-clients (websets, research, agent, monitors).
 *
 * A public method receives the caller's request options as its trailing
 * argument and runs on `this.withRequestOptions(requestOptions)`: a view of
 * the client whose requests carry those options. Whatever the method calls on
 * that view, a request or another method such as a page fetch or a poll,
 * inherits them without changing any argument list.
 */
export abstract class RequestScopedClient {
  /** Request options of this view; undefined on the client itself. */
  protected requestOptions?: RequestOptions;

  /**
   * Returns a view of this client that sends `requestOptions` with every
   * request, on top of any the client already carries. Returns the client
   * itself when there is nothing to add.
   */
  protected withRequestOptions(requestOptions?: RequestOptions | null): this {
    if (mergeRequestOptions(requestOptions) === undefined) {
      return this;
    }
    const view: this = Object.create(this);
    view.requestOptions = mergeRequestOptions(
      this.requestOptions,
      requestOptions
    );
    return view;
  }

  /**
   * Returns the view a listing fetches its pages with after the first: this
   * one without a `cursor` in the extra `query`. A listing advances the
   * cursor itself; an extra `cursor` selects where it starts and, sent again,
   * would replace every later cursor and fetch that page forever.
   */
  protected forNextPage(): this {
    const query = this.requestOptions?.query;
    if (!query || !("cursor" in query)) {
      return this;
    }
    const { cursor: _cursor, ...remaining } = query;
    const view: this = Object.create(this);
    view.requestOptions = { ...this.requestOptions, query: remaining };
    return view;
  }
}
