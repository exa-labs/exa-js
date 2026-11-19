/**
 * Zod schemas are converted to JSON Schema whichever zod the app uses: zod 3,
 * zod 4 (classic or mini), or a different copy of zod than the SDK resolves.
 * Before this, only schemas that were `instanceof` the SDK's own `zod/v3`
 * `ZodType` were converted; every other zod schema was sent to the API as its
 * raw internals, and the API ignored it without an error.
 */
import { createRequire } from "node:module";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z as z4 } from "zod";
import * as zm from "zod/mini";
import { ZodType, z as z3 } from "zod/v3";
import Exa from "../../src";
import { getProtectedClient } from "./helpers";
import { isZodSchema, zodToJsonSchema } from "../../src/zod-utils";

/**
 * Loads a second, independent copy of `zod/v3`: the situation when an app's
 * zod is installed separately from the SDK's (for example an app on zod 3.23,
 * which npm nests apart from the SDK's zod). Its classes are not the SDK's.
 */
function loadSeparateZod3(): typeof z3 {
  const require = createRequire(import.meta.url);
  for (const key of Object.keys(require.cache)) {
    if (/[\\/]node_modules[\\/]zod[\\/]/.test(key)) delete require.cache[key];
  }
  return require("zod/v3").z;
}

const z3Separate = loadSeparateZod3();

const expectedSchema = {
  type: "object",
  properties: {
    headline: { type: "string", description: "One-line headline" },
    year: { type: "integer" },
    topic: { type: "string", enum: ["ai", "search"] },
  },
  required: ["headline", "year", "topic"],
  additionalProperties: false,
};

const schemas = {
  "zod 3": z3.object({
    headline: z3.string().describe("One-line headline"),
    year: z3.number().int(),
    topic: z3.enum(["ai", "search"]),
  }),
  "zod 3 (separate copy)": z3Separate.object({
    headline: z3Separate.string().describe("One-line headline"),
    year: z3Separate.number().int(),
    topic: z3Separate.enum(["ai", "search"]),
  }),
  "zod 4": z4.object({
    headline: z4.string().describe("One-line headline"),
    year: z4.int(),
    topic: z4.enum(["ai", "search"]),
  }),
  "zod 4 mini": zm.object({
    headline: zm.string().register(z4.globalRegistry, {
      description: "One-line headline",
    }),
    year: zm.int(),
    topic: zm.enum(["ai", "search"]),
  }),
};

const cases = Object.entries(schemas);

/** Drops integer bounds, which zod 4 adds for `int()` and zod 3 does not. */
function withoutIntBounds(schema: Record<string, any>): Record<string, any> {
  const { minimum: _min, maximum: _max, ...year } = schema.properties.year;
  return { ...schema, properties: { ...schema.properties, year } };
}

describe("zod schemas from any zod version", () => {
  it("the separate copy is not the SDK's zod (precondition)", () => {
    expect(schemas["zod 3 (separate copy)"]).not.toBeInstanceOf(ZodType);
    expect(schemas["zod 4"]).not.toBeInstanceOf(ZodType);
  });

  it.each(cases)("%s: detected as a zod schema", (_name, schema) => {
    expect(isZodSchema(schema)).toBe(true);
  });

  it.each(cases)(
    "%s: converted to JSON Schema with descriptions",
    (_name, schema) => {
      const json = zodToJsonSchema(schema);
      expect(json.$schema).toBe("http://json-schema.org/draft-07/schema#");
      expect(withoutIntBounds(json)).toMatchObject(expectedSchema);
      expect(json).not.toHaveProperty("_def");
      expect(json).not.toHaveProperty("def");
    }
  );

  it("does not treat JSON Schema or other values as zod", () => {
    expect(isZodSchema({ type: "object", properties: {} })).toBe(false);
    expect(isZodSchema({ _def: {}, type: "object" })).toBe(false);
    expect(isZodSchema({ _zod: "x" })).toBe(false);
    expect(isZodSchema(null)).toBe(false);
    expect(isZodSchema(undefined)).toBe(false);
    expect(isZodSchema("schema")).toBe(false);
  });

  it.each(cases)(
    "%s: getContents() sends summary.schema as JSON Schema",
    async (_name, schema) => {
      const exa = new Exa("test-api-key", "https://api.exa.ai");
      const requestSpy = vi
        .spyOn(exa, "request")
        .mockResolvedValueOnce({ results: [], requestId: "req-1" });

      await exa.getContents(["https://exa.ai"], {
        summary: { query: "Key facts", schema },
      });

      const body = requestSpy.mock.calls[0][2] as Record<string, any>;
      expect(body.summary.schema).toEqual(zodToJsonSchema(schema));
      expect(withoutIntBounds(body.summary.schema)).toMatchObject(
        expectedSchema
      );
    }
  );

  it.each(cases)(
    "%s: answer() sends outputSchema as JSON Schema",
    async (_name, schema) => {
      const exa = new Exa("test-api-key", "https://api.exa.ai");
      const requestSpy = vi
        .spyOn(exa, "request")
        .mockResolvedValueOnce({ answer: {}, citations: [] });

      await exa.answer("What launched?", { outputSchema: schema });

      const body = requestSpy.mock.calls[0][2] as Record<string, any>;
      expect(withoutIntBounds(body.outputSchema)).toMatchObject(expectedSchema);
    }
  );

  it.each(cases)(
    "%s: streamAnswer() sends outputSchema as JSON Schema",
    async (_name, schema) => {
      const exa = new Exa("test-api-key", "https://api.exa.ai");
      const rawSpy = vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
        new Response("data: [DONE]\n\n", {
          headers: { "content-type": "text/event-stream" },
        })
      );

      for await (const _chunk of exa.streamAnswer("What launched?", {
        outputSchema: schema,
      })) {
        // drain
      }

      const body = rawSpy.mock.calls[0][2] as Record<string, any>;
      expect(withoutIntBounds(body.outputSchema)).toMatchObject(expectedSchema);
    }
  );

  it.each(cases)(
    "%s: agent.runs.create() sends outputSchema as JSON Schema",
    async (_name, schema) => {
      const exa = new Exa("test-api-key", "https://api.exa.ai");
      const runClient = getProtectedClient(exa.agent.runs);
      const requestSpy = vi
        .spyOn(runClient, "request")
        .mockResolvedValueOnce({ id: "run_1", object: "agent_run" });

      await exa.agent.runs.create({
        query: "Find recent launches.",
        outputSchema: schema,
      });

      const payload = requestSpy.mock.calls[0][2] as Record<string, any>;
      expect(withoutIntBounds(payload.outputSchema)).toMatchObject(
        expectedSchema
      );
    }
  );

  it("does not treat a JSON Schema with a `_zod` extension key as zod", () => {
    const jsonSchema = {
      type: "object",
      properties: { name: { type: "string", minLength: 2 } },
      required: ["name"],
      _zod: { def: {} },
    };
    expect(isZodSchema(jsonSchema)).toBe(false);
  });

  it("answer() sends a JSON Schema with a `_zod` extension key unchanged", async () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce({ answer: {}, citations: [] });
    const jsonSchema = {
      type: "object",
      properties: { name: { type: "string", minLength: 2 } },
      required: ["name"],
      _zod: { def: {} },
    };

    await exa.answer("q", { outputSchema: jsonSchema });

    const body = requestSpy.mock.calls[0][2] as Record<string, any>;
    expect(body.outputSchema).toEqual(jsonSchema);
  });

  it("converts a zod 4 schema with its own zod's converter when it has one", () => {
    // The SDK's zod/v4/core can be older than the app's zod 4 and misread its
    // internals (zod 3.25's converter drops minLength from a zod 4.6 schema).
    const schema = z4.object({ name: z4.string().min(2) });
    const ownConverter = vi.spyOn(schema, "toJSONSchema");

    const json = zodToJsonSchema(schema);

    expect(ownConverter).toHaveBeenCalled();
    expect(json).toMatchObject({
      properties: { name: { type: "string", minLength: 2 } },
    });
  });

  it("converts a zod/mini schema, which has no converter method", () => {
    const schema = zm.object({ name: zm.string().check(zm.minLength(2)) });
    expect((schema as any).toJSONSchema).toBeUndefined();

    expect(zodToJsonSchema(schema)).toMatchObject({
      properties: { name: { type: "string", minLength: 2 } },
      additionalProperties: false,
    });
  });

  const transformed = {
    "zod 3": z3.object({ headline: z3.string().transform((v) => v.trim()) }),
    "zod 4": z4.object({ headline: z4.string().transform((v) => v.trim()) }),
    "zod 4 mini": zm.object({
      headline: zm.pipe(
        zm.string(),
        zm.transform((v: string) => v.trim())
      ),
    }),
  };

  it.each(Object.entries(transformed))(
    "%s: a transformed field keeps its input type instead of becoming {}",
    (_name, schema) => {
      const json = zodToJsonSchema(schema);
      expect(json).toMatchObject({
        type: "object",
        properties: { headline: { type: "string" } },
        required: ["headline"],
        additionalProperties: false,
      });
    }
  );

  it("answer() sends a zod 4 transformed field's input type", async () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce({ answer: {}, citations: [] });

    await exa.answer("q", { outputSchema: transformed["zod 4"] });

    const body = requestSpy.mock.calls[0][2] as Record<string, any>;
    expect(body.outputSchema.properties.headline).toEqual({ type: "string" });
  });

  it("zod 4: keeps loose and strict objects as declared in the fallback", () => {
    const headline = z4.string().transform((v) => v.trim());
    expect(
      zodToJsonSchema(z4.looseObject({ headline })).additionalProperties
    ).not.toBe(false);
    expect(
      zodToJsonSchema(z4.strictObject({ headline })).additionalProperties
    ).toBe(false);
  });

  it("zod 4: a type with no JSON Schema form still converts, as in zod 3", () => {
    const json = zodToJsonSchema(
      z4.object({ headline: z4.string(), at: z4.date() })
    );
    expect(json).toMatchObject({
      properties: { headline: { type: "string" }, at: {} },
      additionalProperties: false,
    });
  });

  it("infers the answer type from a zod 4 schema", () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");
    vi.spyOn(exa, "request").mockResolvedValue({ answer: {}, citations: [] });
    const outputSchema = z4.object({ headline: z4.string(), year: z4.int() });
    expectTypeOf(exa.answer("q", { outputSchema }))
      .resolves.toHaveProperty("answer")
      .toEqualTypeOf<{
        headline: string;
        year: number;
      }>();
  });

  it("infers the answer type from a zod 3 schema", () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");
    vi.spyOn(exa, "request").mockResolvedValue({ answer: {}, citations: [] });
    const outputSchema = z3.object({ headline: z3.string() });
    expectTypeOf(exa.answer("q", { outputSchema }))
      .resolves.toHaveProperty("answer")
      .toEqualTypeOf<{ headline: string }>();
  });
});
