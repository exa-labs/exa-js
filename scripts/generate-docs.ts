#!/usr/bin/env npx ts-node
import { Project, SourceFile, MethodDeclaration, TypeAliasDeclaration, InterfaceDeclaration, Node } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

interface ParsedParam {
  name: string;
  typeHint: string;
  defaultValue: string | null;
  description: string | null;
}

interface ParsedMethod {
  name: string;
  params: ParsedParam[];
  returnType: string;
  description: string | null;
  examples: string | null;
  isAsync: boolean;
}

interface ParsedType {
  name: string;
  description: string | null;
  fields: Array<{ name: string; type: string; description: string | null }>;
  definition?: string;
}

interface Config {
  export: {
    methods: Record<string, string[]>;
    research_methods: Record<string, string[]>;
    types: string[];
    entity_types: string[];
  };
  getting_started: {
    api_key_url: string;
  };
  input_examples: Record<string, string>;
  output_examples: Record<string, unknown>;
  method_result_objects: Record<string, string>;
  external_type_links: Record<string, string>;
  manual_types: Record<string, { description: string; definition: string }>;
}

class DocGenerator {
  private config: Config;
  private allLinkableTypes: Set<string>;
  private parsedTypes: Map<string, ParsedType> = new Map();

  constructor(configPath: string) {
    this.config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    this.allLinkableTypes = new Set([
      ...this.config.export.types,
      ...this.config.export.entity_types,
      ...Object.keys(this.config.manual_types),
    ]);
  }

  private escapeMdxBraces(text: string): string {
    if (!text) return text;
    return text.replace(/(?<!`)(\{[^}`]+\})(?!`)/g, "`$1`");
  }

  private formatTypeForTable(typeStr: string): string {
    if (!typeStr) return typeStr;
    let result = typeStr
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    result = result.replace(/\|/g, "\\|");
    result = result.replace(/<([^>]+)>/g, "&lt;$1&gt;");
    return `\`${result}\``;
  }

  private formatDescriptionForTable(text: string): string {
    if (!text) return "-";
    return text
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\|/g, "\\|")
      .trim();
  }

  private linkifyType(typeStr: string): string {
    if (!typeStr) return typeStr;
    let result = typeStr;

    for (const [typeName, url] of Object.entries(this.config.external_type_links)) {
      const pattern = new RegExp(`\\b${typeName}\\b(?!\\]\\()`, "g");
      result = result.replace(pattern, `[${typeName}](${url})`);
    }

    for (const typeName of this.allLinkableTypes) {
      const anchor = typeName.toLowerCase();
      const pattern = new RegExp(`\\b${typeName}\\b(?!\\]\\()`, "g");
      result = result.replace(pattern, `[${typeName}](#${anchor})`);
    }

    return result;
  }

  private getJsDocDescription(node: Node): string | null {
    const jsDocs = Node.isJSDocable(node) ? node.getJsDocs() : [];
    if (jsDocs.length === 0) return null;
    
    const jsDoc = jsDocs[0];
    const description = jsDoc.getDescription();
    return description?.trim() || null;
  }

  private getJsDocParamDescription(node: Node, paramName: string): string | null {
    const jsDocs = Node.isJSDocable(node) ? node.getJsDocs() : [];
    if (jsDocs.length === 0) return null;

    const jsDoc = jsDocs[0];
    const tags = jsDoc.getTags();
    
    for (const tag of tags) {
      if (tag.getTagName() === "param") {
        const text = tag.getText();
        const match = text.match(/@param\s+(?:\{[^}]+\}\s+)?(\w+)\s*-?\s*(.*)/s);
        if (match && match[1] === paramName) {
          return match[2]?.trim() || null;
        }
      }
    }
    return null;
  }

  private getJsDocExamples(node: Node): string | null {
    const jsDocs = Node.isJSDocable(node) ? node.getJsDocs() : [];
    if (jsDocs.length === 0) return null;

    const jsDoc = jsDocs[0];
    const tags = jsDoc.getTags();
    
    for (const tag of tags) {
      if (tag.getTagName() === "example") {
        const text = tag.getText();
        const match = text.match(/@example\s*([\s\S]*)/);
        if (match) {
          return match[1]?.trim() || null;
        }
      }
    }
    return null;
  }

  private parseMethod(method: MethodDeclaration): ParsedMethod {
    const params: ParsedParam[] = [];
    
    for (const param of method.getParameters()) {
      const name = param.getName();
      const typeNode = param.getTypeNode();
      const typeHint = typeNode ? typeNode.getText() : "unknown";
      const initializer = param.getInitializer();
      const defaultValue = initializer ? initializer.getText() : null;
      const description = this.getJsDocParamDescription(method, name);

      params.push({ name, typeHint, defaultValue, description });
    }

    const returnTypeNode = method.getReturnTypeNode();
    const returnType = returnTypeNode ? returnTypeNode.getText() : "void";
    const description = this.getJsDocDescription(method);
    const examples = this.getJsDocExamples(method);
    const isAsync = method.isAsync();

    return {
      name: method.getName(),
      params,
      returnType,
      description,
      examples,
      isAsync,
    };
  }

  private parseTypeAlias(typeAlias: TypeAliasDeclaration): ParsedType {
    const name = typeAlias.getName();
    const description = this.getJsDocDescription(typeAlias);
    const typeNode = typeAlias.getTypeNode();
    const definition = typeNode ? typeNode.getText() : "";

    const fields: Array<{ name: string; type: string; description: string | null }> = [];

    if (typeNode && Node.isTypeLiteral(typeNode)) {
      for (const member of typeNode.getMembers()) {
        if (Node.isPropertySignature(member)) {
          const propName = member.getName();
          const propTypeNode = member.getTypeNode();
          const propType = propTypeNode ? propTypeNode.getText() : "unknown";
          const propDesc = this.getJsDocDescription(member);
          fields.push({ name: propName, type: propType, description: propDesc });
        }
      }
    }

    return { name, description, fields, definition };
  }

  private parseInterface(iface: InterfaceDeclaration): ParsedType {
    const name = iface.getName();
    const description = this.getJsDocDescription(iface);
    const fields: Array<{ name: string; type: string; description: string | null }> = [];

    for (const prop of iface.getProperties()) {
      const propName = prop.getName();
      const propTypeNode = prop.getTypeNode();
      const propType = propTypeNode ? propTypeNode.getText() : "unknown";
      const propDesc = this.getJsDocDescription(prop);
      fields.push({ name: propName, type: propType, description: propDesc });
    }

    return { name, description, fields };
  }

  private parseSourceFile(sourceFile: SourceFile, exportMethods: Record<string, string[]>): {
    methodsByClass: Map<string, ParsedMethod[]>;
    types: ParsedType[];
  } {
    const methodsByClass = new Map<string, ParsedMethod[]>();
    const types: ParsedType[] = [];

    for (const classDecl of sourceFile.getClasses()) {
      const className = classDecl.getName();
      if (!className) continue;

      if (exportMethods[className]) {
        const methods: ParsedMethod[] = [];
        const methodNames = exportMethods[className];

        for (const methodName of methodNames) {
          const method = classDecl.getMethod(methodName);
          if (method) {
            const overloads = method.getOverloads();
            if (overloads.length > 0) {
              methods.push(this.parseMethod(method));
            } else {
              methods.push(this.parseMethod(method));
            }
          }
        }

        methodsByClass.set(className, methods);
      }
    }

    for (const typeAlias of sourceFile.getTypeAliases()) {
      const name = typeAlias.getName();
      if (this.config.export.types.includes(name) || this.config.export.entity_types.includes(name)) {
        const parsed = this.parseTypeAlias(typeAlias);
        types.push(parsed);
        this.allLinkableTypes.add(name);
      }
    }

    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (this.config.export.types.includes(name) || this.config.export.entity_types.includes(name)) {
        const parsed = this.parseInterface(iface);
        types.push(parsed);
        this.allLinkableTypes.add(name);
      }
    }

    return { methodsByClass, types };
  }

  private generateGettingStartedSection(): string {
    const apiKeyUrl = this.config.getting_started.api_key_url;
    return `## Getting started

Install the [exa-js](https://github.com/exa-labs/exa-js) SDK

<Tabs>
  <Tab title="npm">
    \`\`\`bash
    npm install exa-js
    \`\`\`
  </Tab>
  <Tab title="yarn">
    \`\`\`bash
    yarn add exa-js
    \`\`\`
  </Tab>
  <Tab title="pnpm">
    \`\`\`bash
    pnpm add exa-js
    \`\`\`
  </Tab>
</Tabs>

and then instantiate an Exa client

\`\`\`typescript
import Exa from "exa-js";

const exa = new Exa();  // Reads EXA_API_KEY from environment
// or explicitly: const exa = new Exa("your-api-key");
\`\`\`

<Card
  title="Get API Key"
  icon="key"
  horizontal
  href="${apiKeyUrl}"
>
  Follow this link to get your API key
</Card>

`;
  }

  private generateMethodMarkdown(method: ParsedMethod, className: string): string {
    const lines: string[] = [];

    const configKey = className === "ResearchClient" 
      ? `research.${method.name}` 
      : method.name;
    const headerName = className === "ResearchClient"
      ? `research.${method.name}`
      : method.name;

    lines.push(`## \`${headerName}\` Method`);
    lines.push("");

    if (method.description) {
      lines.push(this.escapeMdxBraces(method.description));
      lines.push("");
    }

    lines.push("### Input Example");
    lines.push("");
    lines.push("```typescript");

    const inputExample = this.config.input_examples[configKey];
    if (inputExample) {
      lines.push(inputExample);
    } else if (method.examples) {
      lines.push(method.examples);
    } else {
      const prefix = className === "ResearchClient" ? "exa.research" : "exa";
      lines.push(`const result = await ${prefix}.${method.name}(`);
      
      const exampleParams: string[] = [];
      for (const param of method.params) {
        if (param.defaultValue === null) {
          if (param.typeHint.includes("string")) {
            exampleParams.push(`  ${param.name}: "example"`);
          } else {
            exampleParams.push(`  ${param.name}: ...`);
          }
        }
      }
      if (exampleParams.length > 0) {
        lines.push(exampleParams.join(",\n"));
      }
      lines.push(");");
    }

    lines.push("```");
    lines.push("");

    if (method.params.length > 0) {
      lines.push("### Input Parameters");
      lines.push("");
      lines.push("| Parameter | Type | Description | Default |");
      lines.push("| --------- | ---- | ----------- | ------- |");

      for (const param of method.params) {
        const typeStr = this.formatTypeForTable(param.typeHint);
        const descStr = this.formatDescriptionForTable(param.description || "");
        
        let defaultStr: string;
        if (param.defaultValue === null) {
          defaultStr = "Required";
        } else if (param.defaultValue === "undefined") {
          defaultStr = "undefined";
        } else {
          defaultStr = `\`${param.defaultValue}\``;
        }

        lines.push(`| ${param.name} | ${typeStr} | ${descStr} | ${defaultStr} |`);
      }
      lines.push("");
    }

    const outputExample = this.config.output_examples[configKey];
    if (outputExample) {
      lines.push("### Return Example");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(outputExample, null, 2));
      lines.push("```");
      lines.push("");
    }

    const resultClassName = this.config.method_result_objects[configKey];
    if (resultClassName && this.parsedTypes.has(resultClassName)) {
      const resultType = this.parsedTypes.get(resultClassName)!;
      lines.push("### Result Object");
      lines.push("");
      lines.push("| Field | Type | Description |");
      lines.push("| ----- | ---- | ----------- |");
      
      for (const field of resultType.fields) {
        const typeStr = this.formatTypeForTable(field.type);
        const descStr = this.formatDescriptionForTable(field.description || "");
        lines.push(`| ${field.name} | ${typeStr} | ${descStr} |`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  private generateTypeMarkdown(type: ParsedType): string {
    const lines: string[] = [];

    lines.push(`#### \`${type.name}\``);
    lines.push("");

    if (type.description) {
      lines.push(this.escapeMdxBraces(type.description));
      lines.push("");
    }

    if (type.definition && type.fields.length === 0) {
      const formattedDef = type.definition
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      lines.push(`**Type:** \`${formattedDef}\``);
      lines.push("");
    } else if (type.fields.length > 0) {
      lines.push("| Field | Type | Description |");
      lines.push("| ----- | ---- | ----------- |");

      for (const field of type.fields) {
        const typeStr = this.formatTypeForTable(field.type);
        const descStr = this.formatDescriptionForTable(field.description || "");
        lines.push(`| ${field.name} | ${typeStr} | ${descStr} |`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  private generateTypeReferenceSection(types: ParsedType[]): string {
    const lines: string[] = [];

    lines.push("---");
    lines.push("");
    lines.push("## Types Reference");
    lines.push("");
    lines.push("This section documents the types used throughout the SDK.");
    lines.push("");

    const contentOptionsTypes = types.filter(t => 
      this.config.export.types.includes(t.name) && 
      (t.name.includes("Options") || t.name.includes("Contents"))
    );

    const responseTypes = types.filter(t =>
      this.config.export.types.includes(t.name) &&
      !t.name.includes("Options") &&
      !t.name.includes("Contents") &&
      !this.config.export.entity_types.includes(t.name)
    );

    const entityTypes = types.filter(t =>
      this.config.export.entity_types.includes(t.name)
    );

    if (contentOptionsTypes.length > 0) {
      lines.push("### Content Options");
      lines.push("");
      lines.push("These types configure content retrieval options for the `contents` parameter.");
      lines.push("");

      for (const type of contentOptionsTypes) {
        lines.push(this.generateTypeMarkdown(type));
      }
    }

    if (responseTypes.length > 0) {
      lines.push("### Response Types");
      lines.push("");
      lines.push("These types represent API response objects.");
      lines.push("");

      for (const type of responseTypes) {
        lines.push(this.generateTypeMarkdown(type));
      }
    }

    if (entityTypes.length > 0 || Object.keys(this.config.manual_types).length > 0) {
      lines.push("### Entity Types");
      lines.push("");
      lines.push("These types represent structured entity data returned for company or person searches.");
      lines.push("");

      for (const [typeName, typeInfo] of Object.entries(this.config.manual_types)) {
        lines.push(`#### \`${typeName}\``);
        lines.push("");
        lines.push(this.linkifyType(typeInfo.description));
        lines.push("");
        lines.push(`**Type:** ${this.linkifyType(typeInfo.definition)}`);
        lines.push("");
      }

      for (const type of entityTypes) {
        lines.push(this.generateTypeMarkdown(type));
      }
    }

    return lines.join("\n");
  }

  public generateFullDocumentation(indexFilePath: string, researchClientPath: string): string {
    const project = new Project({
      tsConfigFilePath: path.join(path.dirname(indexFilePath), "..", "tsconfig.json"),
    });

    const indexFile = project.addSourceFileAtPath(indexFilePath);
    const { methodsByClass: mainMethods, types: mainTypes } = this.parseSourceFile(
      indexFile,
      this.config.export.methods
    );

    let researchMethods = new Map<string, ParsedMethod[]>();
    let researchTypes: ParsedType[] = [];
    
    if (fs.existsSync(researchClientPath)) {
      const researchFile = project.addSourceFileAtPath(researchClientPath);
      const result = this.parseSourceFile(researchFile, this.config.export.research_methods);
      researchMethods = result.methodsByClass;
      researchTypes = result.types;
    }

    const allTypes = [...mainTypes, ...researchTypes];
    for (const type of allTypes) {
      this.parsedTypes.set(type.name, type);
    }

    const lines: string[] = [];

    lines.push("---");
    lines.push('title: "TypeScript SDK Specification"');
    lines.push('description: "Enumeration of methods and types in the Exa TypeScript SDK (exa-js)."');
    lines.push("---");
    lines.push("");

    lines.push(this.generateGettingStartedSection());

    const exaMethods = mainMethods.get("Exa") || [];
    for (const method of exaMethods) {
      lines.push(this.generateMethodMarkdown(method, "Exa"));
    }

    const researchClientMethods = researchMethods.get("ResearchClient") || [];
    for (const method of researchClientMethods) {
      lines.push(this.generateMethodMarkdown(method, "ResearchClient"));
    }

    if (allTypes.length > 0 || Object.keys(this.config.manual_types).length > 0) {
      lines.push(this.generateTypeReferenceSection(allTypes));
    }

    return lines.join("\n");
  }
}

function main() {
  const scriptDir = path.dirname(__filename);
  const configFile = path.join(scriptDir, "gen_config.json");
  const indexFile = path.join(scriptDir, "..", "src", "index.ts");
  const researchClientFile = path.join(scriptDir, "..", "src", "research", "client.ts");

  if (!fs.existsSync(configFile)) {
    console.error(`Error: Config file not found at ${configFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(indexFile)) {
    console.error(`Error: Index file not found at ${indexFile}`);
    process.exit(1);
  }

  const generator = new DocGenerator(configFile);
  const docs = generator.generateFullDocumentation(indexFile, researchClientFile);
  console.log(docs);
}

main();
