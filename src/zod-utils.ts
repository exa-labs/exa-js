import { ZodType, ZodSchema, toJSONSchema } from "zod";
import type * as core from "zod/v4/core";

export function isZodSchema(obj: any): obj is ZodSchema<any> {
  return obj instanceof ZodType;
}

export function zodToJsonSchema(
  schema: ZodSchema<any>
): Record<string, unknown> {
  return convertSchema(schema);
}

function convertSchema(schema: core.$ZodType): core.JSONSchema.BaseSchema {
  return toJSONSchema(schema, {
    target: "draft-7",
    io: "input",
    reused: "inline",
    unrepresentable: ({ zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "date") {
        return { type: "string", format: "date-time" };
      }
      if (def.type === "set") {
        const result: core.JSONSchema.BaseSchema = {
          type: "array",
          uniqueItems: true,
          items: nestedSchema(def.valueType),
        };
        for (const check of def.checks ?? []) {
          const constraint = (check as core.$ZodChecks)._zod.def;
          if (constraint.check === "min_size") {
            result.minItems = Math.max(
              result.minItems ?? 0,
              constraint.minimum
            );
          } else if (constraint.check === "max_size") {
            result.maxItems = Math.min(
              result.maxItems ?? Infinity,
              constraint.maximum
            );
          } else if (constraint.check === "size_equals") {
            result.minItems = Math.max(result.minItems ?? 0, constraint.size);
            result.maxItems = Math.min(
              result.maxItems ?? Infinity,
              constraint.size
            );
          }
        }
        return result;
      }
      if (def.type === "map") {
        return {
          type: "array",
          maxItems: 125,
          items: {
            type: "array",
            items: [nestedSchema(def.keyType), nestedSchema(def.valueType)],
            minItems: 2,
            maxItems: 2,
          },
        };
      }
      return "throw";
    },
    override: ({ zodSchema, jsonSchema }) => {
      const def = zodSchema._zod.def;
      if (
        def.type === "pipe" &&
        def.in._zod.def.type !== "transform" &&
        def.out._zod.def.type !== "transform"
      ) {
        // Unlike transforms, both stages of a validation pipeline constrain
        // the JSON value, as they did in the previous converter.
        const input = nestedSchema(def.in);
        for (const key of Object.keys(input)) {
          delete jsonSchema[key];
        }
        jsonSchema.allOf = [input, nestedSchema(def.out)];
      }
      // Preserve the previous converter's closed-object schemas while using
      // input mode for defaults and transforms.
      if (def.type === "object") {
        if (def.catchall === undefined) {
          jsonSchema.additionalProperties = false;
        } else if (def.catchall._zod.def.type === "unknown") {
          jsonSchema.additionalProperties = true;
        }
      }
    },
  });
}

function nestedSchema(schema: core.$ZodType): core.JSONSchema.BaseSchema {
  const result = convertSchema(schema);
  delete result.$schema;
  return result;
}
