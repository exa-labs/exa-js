import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";

type Lister = Record<string, (...args: unknown[]) => unknown>;

interface Case {
  name: string;
  client: unknown;
  listAll: string;
  getAll: string;
  page: string;
  lead: unknown[];
  extra?: Record<string, unknown>;
}

const cases = (exa: Exa): Case[] => {
  const betas = { betas: ["test-beta"] };
  const plain = (name: string, client: unknown, lead: unknown[] = []) => ({
    name,
    client,
    listAll: "listAll",
    getAll: "getAll",
    page: "list",
    lead,
  });
  return [
    plain("agent.runs", exa.agent.runs),
    { ...plain("beta.agent.runs", exa.beta.agent.runs), extra: betas },
    {
      ...plain("beta.agent.monitors", exa.beta.agent.monitors),
      extra: betas,
    },
    {
      ...plain("beta.agent.monitors.entities", exa.beta.agent.monitors.entities, [
        "mon_1",
      ]),
      extra: betas,
    },
    {
      ...plain("beta.agent.monitors.changes", exa.beta.agent.monitors.changes, [
        "mon_1",
      ]),
      extra: betas,
    },
    plain("monitors", exa.monitors),
    plain("monitors.runs", exa.monitors.runs, ["sm_1"]),
    plain("websets", exa.websets),
    plain("websets.events", exa.websets.events),
    plain("websets.imports", exa.websets.imports),
    plain("websets.items", exa.websets.items, ["ws_1"]),
    plain("websets.monitors", exa.websets.monitors),
    plain("websets.webhooks", exa.websets.webhooks),
    {
      ...plain("websets.webhooks attempts", exa.websets.webhooks, ["wh_1"]),
      listAll: "listAllAttempts",
      getAll: "getAllAttempts",
      page: "listAttempts",
    },
  ];
};

// Serves two pages and records each call's arguments as they were when it was
// made.
const twoPages = (client: unknown, page: string) => {
  const pages = [
    { data: ["a", "b"], hasMore: true, nextCursor: "c1" },
    { data: ["c"], hasMore: false, nextCursor: null },
  ];
  const calls: unknown[][] = [];
  vi.spyOn(client as Lister, page).mockImplementation(async (...args) => {
    calls.push(args.map((arg) => (typeof arg === "object" ? { ...arg } : arg)));
    return pages[calls.length - 1];
  });
  return calls;
};

describe("listAll and getAll", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.restoreAllMocks();
    exa = new Exa("test-key", "https://api.exa.ai");
  });

  cases(new Exa("test-key")).forEach(({ name }, index) => {
    it(`${name}: listAll follows nextCursor until the last page`, async () => {
      const c = cases(exa)[index];
      const calls = twoPages(c.client, c.page);
      const options = { limit: 2, cursor: "c0", ...c.extra };

      const items: unknown[] = [];
      for await (const item of (c.client as Lister)[c.listAll](
        ...c.lead,
        options
      ) as AsyncIterable<unknown>) {
        items.push(item);
      }

      expect(items).toEqual(["a", "b", "c"]);
      expect(calls).toEqual([
        [...c.lead, options],
        [...c.lead, { ...options, cursor: "c1" }],
      ]);
    });

    it(`${name}: getAll collects every page`, async () => {
      const c = cases(exa)[index];
      twoPages(c.client, c.page);

      const items = await (c.client as Lister)[c.getAll](...c.lead, {
        ...c.extra,
      });

      expect(items).toEqual(["a", "b", "c"]);
    });
  });

  it("stops when a page has more but no nextCursor", async () => {
    const spy = vi
      .spyOn(exa.websets as unknown as Lister, "list")
      .mockResolvedValueOnce({ data: ["a"], hasMore: true, nextCursor: null });

    expect(await exa.websets.getAll()).toEqual(["a"]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns nothing for an empty first page", async () => {
    const spy = vi
      .spyOn(exa.websets as unknown as Lister, "list")
      .mockResolvedValueOnce({ data: [], hasMore: false, nextCursor: null });

    expect(await exa.websets.getAll()).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
