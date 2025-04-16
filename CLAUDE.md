# Exa-JS Code Assistant Guide

## Build & Test Commands
- Build: `npm run build`
- Fast Build: `npm run build-fast` (only builds index.ts)
- Test All: `npm run test`
- Test Single: `npx vitest run test/path/to/test.ts`
- Generate Docs: `npm run generate-docs`

## Code Style Guidelines
- **TypeScript**: ES2020 target, ESNext modules, strict mode
- **Formatting**: Default Prettier (2.8.4)
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

## Websets API Implementation
- The Python SDK has a comprehensive Websets API implementation that needs to be mirrored in TypeScript
- Key components include:
  - WebsetsClient with methods for create, get, list, update, delete, cancel, wait_until_idle
  - Sub-clients for items, searches, enrichments, and webhooks
  - Extensive type definitions for all request/response objects
  - Proper handling of pagination for list operations
  - Support for entity types (company, person, article, research paper, custom)