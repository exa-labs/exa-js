/**
 * Transport-level options for Exa API requests.
 *
 * These are never serialized into JSON request bodies; they only control the
 * underlying `fetch` call (cancellation and timeouts).
 */
export type RequestOptions = {
  /**
   * AbortSignal used to cancel the in-flight HTTP request.
   * Useful for stale UI requests, navigation changes, or composing timeouts.
   */
  signal?: AbortSignal;

  /**
   * Request timeout in milliseconds. When set, the SDK aborts the fetch after
   * this duration (via `AbortSignal.timeout` when available).
   *
   * If both `timeout` and `signal` are provided, the request aborts when either
   * fires first.
   */
  timeout?: number;
};

/**
 * Result of resolving transport options into a fetch-ready AbortSignal.
 *
 * Call `dispose()` once the request settles (success, failure, or stream end)
 * so fallback `anySignal` listeners and timeout timers are released.
 */
export type ResolvedRequestSignal = {
  signal: AbortSignal | undefined;
  dispose: () => void;
  /**
   * True when `dispose()` actually releases listeners or timers. False on
   * runtimes with native `AbortSignal.any` / `AbortSignal.timeout`, where
   * callers can skip dispose-lifetime bookkeeping entirely.
   */
  needsDispose: boolean;
};

const REQUEST_OPTION_KEYS = ["signal", "timeout"] as const;

/**
 * Removes transport-only fields so they are never serialized into API payloads.
 */
export function omitRequestOptions<T extends object>(
  options?: T
): Omit<T, keyof RequestOptions> | undefined {
  if (options == null) {
    return undefined;
  }

  const rest = { ...options } as Record<string, unknown>;
  for (const key of REQUEST_OPTION_KEYS) {
    delete rest[key];
  }
  return rest as Omit<T, keyof RequestOptions>;
}

/**
 * Extracts transport options from a mixed options bag.
 */
export function pickRequestOptions(
  options?: RequestOptions | null
): RequestOptions | undefined {
  if (options == null) {
    return undefined;
  }

  const picked: RequestOptions = {};
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

type DisposableAbortSignal = {
  signal: AbortSignal;
  dispose: () => void;
};

/** Shared sentinel so callers can detect "nothing to release". */
const NOOP_DISPOSE = () => {};

function createTimeoutSignal(timeoutMs: number): DisposableAbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return { signal: AbortSignal.timeout(timeoutMs), dispose: NOOP_DISPOSE };
  }

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

  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.any === "function"
  ) {
    return { signal: AbortSignal.any(signals), dispose: NOOP_DISPOSE };
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
 * fallback listeners / timers are released.
 */
export function resolveRequestSignal(
  options?: RequestOptions | null
): ResolvedRequestSignal {
  if (options == null) {
    return { signal: undefined, dispose: () => {}, needsDispose: false };
  }

  const { signal, timeout } = options;
  const signals: AbortSignal[] = [];
  const disposers: Array<() => void> = [];

  if (signal) {
    signals.push(signal);
  }

  if (timeout != null) {
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new TypeError(
        `Request timeout must be a positive number of milliseconds (received ${timeout})`
      );
    }
    const timeoutSignal = createTimeoutSignal(timeout);
    signals.push(timeoutSignal.signal);
    if (timeoutSignal.dispose !== NOOP_DISPOSE) {
      disposers.push(timeoutSignal.dispose);
    }
  }

  if (signals.length === 0) {
    return { signal: undefined, dispose: () => {}, needsDispose: false };
  }

  const combined = anySignal(signals);
  if (combined.dispose !== NOOP_DISPOSE) {
    disposers.push(combined.dispose);
  }

  if (disposers.length === 0) {
    return {
      signal: combined.signal,
      dispose: () => {},
      needsDispose: false,
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
  };
}

// FinalizationRegistry is ES2021; the project lib target is ES2020, so we
// look it up off globalThis with a minimal structural type.
type FinalizationRegistryLike = {
  register(
    target: object,
    heldValue: () => void,
    unregisterToken?: object
  ): void;
  unregister(unregisterToken: object): void;
};

const FinalizationRegistryCtor = (
  globalThis as {
    FinalizationRegistry?: new (
      cleanup: (heldValue: () => void) => void
    ) => FinalizationRegistryLike;
  }
).FinalizationRegistry;

const bodySettleRegistry = FinalizationRegistryCtor
  ? new FinalizationRegistryCtor((dispose) => {
      dispose();
    })
  : undefined;

/**
 * Keeps transport `dispose()` alive until the response body is consumed,
 * cancelled, or errors. Disposes immediately when there is no body.
 *
 * Used by `rawRequest` so fallback `anySignal` listeners stay attached for the
 * full fetch lifetime (headers + body), not just until headers resolve.
 */
export function withDisposeOnBodySettled(
  response: Response,
  dispose: () => void
): Response {
  const body = response.body;
  if (!body) {
    dispose();
    return response;
  }

  let settled = false;
  const unregisterToken = {};

  const settle = () => {
    if (settled) return;
    settled = true;
    bodySettleRegistry?.unregister(unregisterToken);
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
        controller.error(error);
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

  // Best-effort cleanup if a caller never reads/cancels the body. Register
  // `settle` (not `dispose`) so the settled flag flips too.
  bodySettleRegistry?.register(wrapped, settle, unregisterToken);
  return wrapped;
}
