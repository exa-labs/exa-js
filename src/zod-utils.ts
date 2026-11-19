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
 * zod 4 schemas keep their definition under `_zod.def`. Checked by shape, not
 * `instanceof`, so schemas built with any copy of zod 4 are recognized.
 */
function isZod4Schema(obj: unknown): obj is Zod4Schema<any> {
  if (!isObjectLike(obj)) return false;
  const internals = obj._zod;
  return isObjectLike(internals) && isObjectLike(internals.def);
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

/**
 * Converts a zod 3 or zod 4 schema to a JSON Schema (draft-07) object with
 * every definition inlined.
 */
export function zodToJsonSchema(
  schema: ZodSchema<any>
): Record<string, unknown> {
  if (isZod4Schema(schema)) {
    return convertZod4ToJsonSchema(schema as any, {
      target: "draft-7",
      unrepresentable: "any",
    }) as Record<string, unknown>;
  }
  return convertZod3ToJsonSchema(schema as any, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
}
