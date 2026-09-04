import fs from "node:fs";
import path from "node:path";
import { Project, SyntaxKind } from "ts-morph";
import { expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const endpointInventoryPath = path.join(__dirname, "endpoint-coverage.tsv");
const goldenPath = path.join(__dirname, "goldens/signatures.jsonl");
const requestGoldenPath = path.join(__dirname, "goldens/requests.json");

function inventory(): Array<Record<string, string>> {
  const [header, ...lines] = fs
    .readFileSync(path.join(__dirname, "exa-js-surface.tsv"), "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n");
  const fields = header.split("\t");
  return lines.map((line) =>
    Object.fromEntries(
      line.split("\t").map((value, index) => [fields[index], value])
    )
  );
}

function snapshot(): Array<{ name: string; signature: string }> {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const files = project.addSourceFilesAtPaths(path.join(root, "src/**/*.ts"));
  const methods = new Map<string, string>();
  const methodsByName = new Map<string, string>();
  for (const file of files) {
    const relative = path
      .relative(root, file.getFilePath())
      .replace(/\\/g, "/");
    for (const declaration of file.getStatements()) {
      if (declaration.getKind() === SyntaxKind.ClassDeclaration) {
        const cls = declaration.asKindOrThrow(SyntaxKind.ClassDeclaration);
        const name = cls.getName();
        if (!name || name.startsWith("_")) continue;
        for (const method of cls.getMethods()) {
          if (!method.getName().startsWith("_")) {
            methods.set(
              `${relative}:${method.getStartLineNumber()}`,
              method.getText().split("{")[0].trim()
            );
            methodsByName.set(
              method.getName(),
              method.getText().split("{")[0].trim()
            );
          }
        }
      }
    }
  }
  return inventory().map((row) => {
    const [sourceFile, line] = row["source_file:line"].split(":");
    const key = `${sourceFile.replace(/^.*\/src\//, "src/")}:${line}`;
    const signature = methods.get(key) ?? methodsByName.get(row.method);
    expect(signature, `missing public callable ${key}`).toBeDefined();
    return {
      name: `${row.namespace}.${row.method}`,
      signature: signature!.replace(/\s+/g, " ").trim(),
    };
  });
}

function writeOrCompare(value: unknown): void {
  const rendered = (value as unknown[])
    .map((item) => JSON.stringify(item))
    .join("\n") + "\n";
  if (process.env.EXA_CONFORMANCE_RECORD === "1") {
    fs.writeFileSync(goldenPath, rendered);
  } else {
    expect(fs.readFileSync(goldenPath, "utf8").replace(/\r\n/g, "\n")).toBe(
      rendered
    );
  }
}

it("matches the inspect-style public source snapshot", () => {
  writeOrCompare(snapshot());
});

it("covers every endpoint in the SDK inventory", () => {
  const lines = fs
    .readFileSync(endpointInventoryPath, "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n");
  const header = lines.shift()!.split("\t");
  const endpoints = new Set(
    lines
      .map((line) =>
        Object.fromEntries(line.split("\t").map((v, i) => [header[i], v]))
      )
      .filter((row) => row.exa_js_methods && row.exa_js_methods !== "NONE")
      .map((row) => `${row.method} ${row.path}`)
  );
  const corpus = fs
    .readFileSync(requestGoldenPath, "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line)) as Array<{
    method: string;
    url: string;
  }>;
  const covered = new Set(
    corpus.map(
      (request) => `${request.method} ${new URL(request.url).pathname}`
    )
  );
  for (const endpoint of endpoints) {
    const [method, requestPath] = endpoint.split(" ", 2);
    const pattern = new RegExp(
      `^${requestPath.replace(/\{[^}]+\}/g, "[^/]+")}$`
    );
    const matched = [...covered].some((item) => {
      const [actualMethod, actualPath] = item.split(" ", 2);
      return actualMethod === method && pattern.test(actualPath);
    });
    expect(matched).toBe(true);
  }
});
