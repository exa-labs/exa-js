import { ZodType, ZodSchema } from "zod";
import { zodToJsonSchema as convertZodToJsonSchema } from "zod-to-json-schema";

export function isZodSchema(obj: any): obj is ZodSchema<any> {
  return obj instanceof ZodType;
}

export function zodToJsonSchema(
  schema: ZodSchema<unknown>
): Record<string, unknown> {
  // Use Function constructor to erase complex generic types from zod-to-json-schema
  // and avoid TS2589 "Type instantiation is excessively deep" error during compilation
  const fn = convertZodToJsonSchema as Function;
  return fn(schema, { $refStrategy: "none" }) as Record<string, unknown>;
}
