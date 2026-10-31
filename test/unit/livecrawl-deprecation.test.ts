/**
 * The API rejects `livecrawl` combined with `maxAgeHours`, and `maxAgeHours`
 * replaces it. The published types mark `livecrawl` `@deprecated` and name the
 * replacement, so editors flag it and readers of the type definitions see it.
 * This reads the JSDoc of `ContentsOptions["livecrawl"]` as the TypeScript
 * compiler resolves it from the package entry point. The methods that take
 * contents options also refuse, at compile time, options that set both.
 */
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, test } from "vitest";
import Exa, {
  type ContentsOptions,
  type RegularSearchOptions,
} from "../../src";

const entryPoint = fileURLToPath(
  new URL("../../src/index.ts", import.meta.url)
);

/** The JSDoc tags of a property of a type exported by the package entry point. */
function exportedPropertyJsDocTags(
  typeName: string,
  propertyName: string
): ts.JSDocTagInfo[] {
  // Only the entry point's own declarations are read, so imports, lib files
  // and @types packages are left unloaded.
  const program = ts.createProgram([entryPoint], {
    noEmit: true,
    noLib: true,
    noResolve: true,
    types: [],
  });
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(entryPoint);
  const moduleSymbol = entry && checker.getSymbolAtLocation(entry);
  const exported = moduleSymbol
    ? checker.getExportsOfModule(moduleSymbol).find((s) => s.name === typeName)
    : undefined;
  if (!exported) {
    throw new Error(`${typeName} is not exported from ${entryPoint}`);
  }
  const property = checker
    .getDeclaredTypeOfSymbol(exported)
    .getProperty(propertyName);
  if (!property) {
    throw new Error(`${typeName} has no property ${propertyName}`);
  }
  return property.getJsDocTags(checker);
}

test("ContentsOptions marks livecrawl deprecated in favor of maxAgeHours", () => {
  const deprecated = exportedPropertyJsDocTags(
    "ContentsOptions",
    "livecrawl"
  ).find((tag) => tag.name === "deprecated");

  expect(deprecated).toBeDefined();
  expect(ts.displayPartsToString(deprecated?.text)).toContain("`maxAgeHours`");
});

/**
 * Calls that set both `maxAgeHours` and `livecrawl` do not compile. This
 * function is never run: `npm run typecheck` fails if an expected error
 * disappears, and the calls that set one option must keep compiling.
 */
function freshnessOptionCalls(
  exa: Exa,
  stored: ContentsOptions,
  storedSearch: RegularSearchOptions
) {
  const url = "https://example.com";
  const storedConflict = {
    numResults: 1,
    contents: { maxAgeHours: 1, livecrawl: "always" as const },
  };
  return [
    exa.getContents(url, {
      text: true,
      maxAgeHours: 1,
      // @ts-expect-error `livecrawl` cannot be combined with `maxAgeHours`.
      livecrawl: "always",
    }),
    exa.search("query", {
      contents: {
        text: true,
        maxAgeHours: 1,
        // @ts-expect-error `livecrawl` cannot be combined with `maxAgeHours`.
        livecrawl: "always",
      },
    }),
    // A stored object reaches the overloads without contents too.
    // @ts-expect-error `livecrawl` cannot be combined with `maxAgeHours`.
    exa.search("query", storedConflict),
    // @ts-expect-error `livecrawl` cannot be combined with `maxAgeHours`.
    exa.findSimilar(url, storedConflict),
    exa.searchAndContents("query", {
      maxAgeHours: 1,
      // @ts-expect-error `livecrawl` cannot be combined with `maxAgeHours`.
      livecrawl: "always",
    }),
    exa.getContents(url, { text: true, maxAgeHours: 1 }),
    exa.search("query", { contents: { text: true, maxAgeHours: 0 } }),
    exa.getContents(url, { text: true, livecrawl: "always" }),
    exa.getContents(url, stored),
    exa.search("query", { contents: stored }),
    exa.search("query", storedSearch),
    exa.search("query", { numResults: 1 }),
  ];
}

test("the freshness option checks are compiled with the tests", () => {
  expect(freshnessOptionCalls).toBeTypeOf("function");
});
