# Exa-JS Code Assistant Guide

## Build & Test Commands
- Build: `npm run build`
- Fast Build: `npm run build-fast` (only builds index.ts)
- Test All: `npm run test`
- Test Unit / Integration: `npm run test:unit` / `npm run test:integration`
- Test Single: `npx vitest run test/path/to/test.ts`
- Typecheck: `npm run typecheck` (examples: `npm run typecheck:examples`)
- Format: `npm run format`
- Generate Docs: `npm run generate-docs`

CI installs and tests with pnpm (`pnpm i && pnpm test`).

## Releases

Release Please owns versioning. Never edit the `package.json` version or `CHANGELOG.md`
by hand, and never run `npm version` / `npm publish` or the legacy `version:*` /
`publish:*` scripts (see `release-please-config.json` and
`.github/workflows/release-please.yml`).

- Use Conventional Commit titles (`feat:`, `fix:`, `chore:`, …); they determine the
  next version and the changelog entry.
- Merges to `master` keep a single Release PR up to date. Merging that PR creates the
  tag and GitHub Release, which triggers the npm publish workflow (OIDC trusted
  publishing).

## Code Style Guidelines
- **TypeScript**: ES2020 target, ESNext modules, strict mode
- **Formatting**: Prettier 3.x, configured in `.prettierrc` (double quotes, semicolons, 80 cols, 2-space indent)
- **Imports**: ES imports, built-in modules first
- **Types**: 
  - Comprehensive TypeScript types with JSDoc comments
  - Generic types for API responses
  - Interfaces/Types in PascalCase (e.g., `SearchOptions`)
  - Optional properties with `?` suffix
- **Naming**:
  - Classes: PascalCase (e.g., `Exa`)
  - Methods/Variables: camelCase 
  - Consistent patterns (e.g., `*Options`, `*Response`)
- **Error Handling**: 
  - Explicit errors with descriptive messages
  - API error handling with status codes
- **API Design**:
  - Class-based design with clear method signatures
  - Private helper methods for common functionality
  - Method overloading via optional parameters

## Generated Types
- Websets types live in `src/websets/openapi.ts` and are generated from the OpenAPI spec
  with `npm run generate:types:websets` — never hand-edit that file