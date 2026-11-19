import { toJSONSchema as convertZod4ToJsonSchema } from "zod/v4/core";
import { zodToJsonSchema as convertZod3ToJsonSchema } from "zod-to-json-schema";

/**
 * A zod 3 schema whose output is `T`, typed by shape rather than as zod's
 * `ZodType`: under `moduleResolution: node`, zod 3.25 resolves `zod` and
 * `zod/v3` to different declaration files, and comparing a caller's schema
 * across them exhausts the TypeScript checker. `_parse` exists only on zod 3
 * schemas.
 */
export type Zod3Schema<T = any> = {
  readonly _output: T;
  _parse(input: any): any;
};

/**
 * A zod 4 schema (classic `zod` / `zod/v4`, or `zod/mini`) whose output is
 * `T`. Every zod 4 schema carries its internals, including the output type,
 * under `_zod`.
 */
export type Zod4Schema<T = any> = {
  readonly _zod: { readonly output: T };
};

/** A zod 3 or zod 4 schema whose output is `T`. */
export type ZodSchema<T = any> = Zod3Schema<T> | Zod4Schema<T>;

function isObjectLike(obj: unknown): obj is Record<string, unknown> {
  return (typeof obj === "object" || typeof obj === "function") && obj !== null;
}

/**
 * zod 4 schemas keep their definition under `_zod.def` and their parser at
 * `_zod.run`. Checked by shape, not `instanceof`, so schemas built with any
 * copy of zod 4 are recognized. Requiring the `run` function keeps a plain
 * JSON Schema that happens to carry a `_zod` extension key from being
 * mistaken for zod.
 */
function isZod4Schema(obj: unknown): obj is Zod4Schema<any> {
  if (!isObjectLike(obj)) return false;
  const internals = obj._zod;
  return (
    isObjectLike(internals) &&
    isObjectLike(internals.def) &&
    typeof internals.run === "function"
  );
}

/**
 * zod 3 schemas have a `_def` and a `_parse` method. zod 4 classic schemas
 * also expose `_def`, so callers check for zod 4 first.
 */
function isZod3Schema(obj: unknown): obj is Zod3Schema<any> {
  if (!isObjectLike(obj)) return false;
  return isObjectLike(obj._def) && typeof obj._parse === "function";
}

/**
 * Whether `obj` is a zod schema, from zod 3 or zod 4. Detection is by shape
 * rather than `instanceof`, so it also holds when the app's zod is a
 * different copy or major version than the one this SDK resolves.
 */
export function isZodSchema(obj: unknown): obj is ZodSchema<any> {
  return isZod4Schema(obj) || isZod3Schema(obj);
}

type Zod4ConvertParams = {
  target: "draft-7";
  unrepresentable: "any";
  override: (ctx: {
    zodSchema: unknown;
    jsonSchema: Record<string, unknown>;
  }) => void;
};

type Zod4Def = { type?: string; in?: Zod4Schema<any>; out?: Zod4Schema<any> };

function defOf(schema: unknown): Zod4Def | undefined {
  return (schema as { _zod?: { def?: Zod4Def } })._zod?.def;
}

/**
 * Converts with the converter from the schema's own copy of zod when it has
 * one: classic schemas carry a `toJSONSchema` method. The SDK's
 * `zod/v4/core` converter can be older than the app's zod and misread newer
 * internals (zod 3.25's drops `minLength` from a zod 4.6 `.min()`), so it is
 * only the fallback, for `zod/mini` schemas, which have no method. (A mini
 * schema from a newer zod than the SDK resolves can still lose such
 * constraints; mini exposes no converter of its own to use instead.)
 */
function convertZod4(
  schema: Zod4Schema<any>,
  params: Zod4ConvertParams
): Record<string, unknown> {
  const ownConverter = (schema as { toJSONSchema?: unknown }).toJSONSchema;
  return (
    typeof ownConverter === "function"
      ? ownConverter.call(schema, params)
      : convertZod4ToJsonSchema(schema as any, params)
  ) as Record<string, unknown>;
}

/**
 * Converts a zod 4 schema to JSON Schema by its output types, as before.
 * Types with no JSON Schema form, such as `z.date()`, become `{}`, as they
 * do for zod 3 schemas.
 *
 * A `.transform()` field has no output type zod can describe, so it would
 * also become `{}`, which constrains nothing. Such a field (a pipe whose
 * output side is a transform) is described by its input side instead, what
 * zod-to-json-schema does for zod 3 effects. Only that field changes; every
 * other field keeps its output form.
 */
function zod4ToJsonSchema(schema: Zod4Schema<any>): Record<string, unknown> {
  const params: Zod4ConvertParams = {
    target: "draft-7",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      const def = defOf(zodSchema);
      if (def?.type !== "pipe" || !def.in) return;
      if (defOf(def.out)?.type !== "transform") return;
      const { $schema: _drop, ...inputSide } = convertZod4(def.in, params);
      for (const key of Object.keys(jsonSchema)) delete jsonSchema[key];
      Object.assign(jsonSchema, inputSide);
    },
  };
  return convertZod4(schema, params);
}

/**
 * Converts a zod 3 or zod 4 schema to a JSON Schema (draft-07) object with
 * every definition inlined.
 */
export function zodToJsonSchema(
  schema: ZodSchema<any>
): Record<string, unknown> {
  if (isZod4Schema(schema)) return zod4ToJsonSchema(schema);
  return convertZod3ToJsonSchema(schema as any, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
}
