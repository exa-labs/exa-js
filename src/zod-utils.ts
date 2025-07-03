import { ZodType, ZodSchema } from "zod";
import { zodToJsonSchema as convertZodToJsonSchema } from "zod-to-json-schema";

export function isZodSchema(obj: any): obj is ZodSchema<any> {
  return obj instanceof ZodType;
}

export function zodToJsonSchema(
  schema: ZodSchema<any>
): Record<string, unknown> {
  return convertZodToJsonSchema(schema, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
}
