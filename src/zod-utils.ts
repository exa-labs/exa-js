import { zodToJsonSchema as convertZodToJsonSchema } from "zod-to-json-schema";

/**
 * Duck-type check for Zod schemas. Uses structural detection instead of
 * `instanceof` so it works across different Zod instances/versions that
 * may coexist in the same dependency tree.
 */
export function isZodSchema(obj: any): boolean {
  return (
    obj != null &&
    typeof obj === "object" &&
    typeof obj.safeParse === "function" &&
    typeof obj.parse === "function" &&
    "_def" in obj
  );
}

export function zodToJsonSchema(
  schema: any
): Record<string, unknown> {
  // Use type erasure via Function to avoid TS2589 "type instantiation
  // excessively deep" errors from zod-to-json-schema's recursive types.
  const fn = convertZodToJsonSchema as Function;
  return fn(schema, { $refStrategy: "none" }) as Record<string, unknown>;
}
