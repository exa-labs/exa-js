import { ZodType } from "zod/v3";
import { zodToJsonSchema as convertZodToJsonSchema } from "zod-to-json-schema";

/**
 * A zod 3 schema whose output is `T`, typed by shape rather than as zod's
 * `ZodType`: under `moduleResolution: node`, zod 3.25 resolves `zod` and
 * `zod/v3` to different declaration files, and comparing a caller's schema
 * across them exhausts the TypeScript checker. `_parse` exists only on zod 3
 * schemas, so zod 4 schemas are still rejected at compile time.
 */
export type ZodSchema<T = any> = {
  readonly _output: T;
  _parse(input: any): any;
};

export function isZodSchema(obj: any): obj is ZodSchema<any> {
  return obj instanceof ZodType;
}

export function zodToJsonSchema(
  schema: ZodSchema<any>
): Record<string, unknown> {
  return convertZodToJsonSchema(schema as any, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
}
