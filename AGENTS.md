# AGENTS.md

This file provides guidance to AI agents working on the typeform Attio app.

## Context

This is an Attio App SDK app. It integrates Attio CRM with Typeform (online form builder), enabling:

- Triggering Attio workflows when a Typeform form is submitted
- Picking a specific form in the block configurator
- Registering/removing Typeform webhooks on activate/deactivate
- Parsing Typeform answers and mapping them to typed Attio outcome values

## File and folder structure

| Path                                        | Description                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/app.ts`                                | Main entrypoint — registers the workflow block                                                          |
| `src/blocks/form-submitted/`                | Trigger block — `block.ts`, `trigger.ts`, `activate.ts`, `deactivate.ts`, `configurator.tsx`            |
| `src/typeform/`                             | Typeform API client, server actions (list/get form), webhook payload parser, error types                |
| `src/typeform/types/errors.ts`              | Typeform-specific error types                                                                           |
| `src/types/`                                | Zod schemas and inferred TypeScript types for Typeform API responses                                    |
| `src/utils/`                                | Field → outcome conversion, outcome key building, email + phone normalisation                           |
| `test/`                                     | Vitest test helpers — mock Attio server/client; spec files live alongside source in `src/`              |

## Workflow blocks

| Block            | Type    | Description                                                            |
| ---------------- | ------- | ---------------------------------------------------------------------- |
| `form-submitted` | trigger | Fires when a Typeform form is submitted; config: `{ formId }`          |

## Environment

### Client-side code

Runs in browser inside a sandboxed custom JS runtime. Constraints:

- MUST NOT render HTML tags directly (`<div>`, etc.) — use App SDK components only
- MUST NOT use custom CSS or styles
- MUST NOT call `fetch` directly — use server-side functions instead
- Files rendering React components MUST use `.tsx` extension

### Server-side code

Runs in files ending in `.server.ts`, `.webhook.ts`, `.event.ts`. Custom JS runtime (not Node.js) — some Node.js APIs are unavailable.

## Using the Attio App SDK

Three packages:

- `attio/client` — client-side imports
- `attio/server` — server-side imports
- `attio` — shared/environment-agnostic imports

Always verify imports against existing examples, TypeScript types, or SDK docs. Never guess.

## Coding guidelines

- Use Zod to validate data from external APIs (Typeform responses)
- Only include properties in Zod schemas that are explicitly needed
- Use `try/catch` around `.json()` calls
- Use `console.error` for unexpected errors — do NOT log sensitive data (emails, passwords)
- Handle API errors gracefully — return fallback UI in React components, never throw
- Prefer named arguments over positional when using 3+ args
- No `any` — type errors must be fixed properly

### Error messages (user-facing)

- Never dump raw JSON, HTTP status codes, or square brackets in UI error messages.
- Never expose transport-layer details — say "An unexpected error occurred when calling Typeform's API" not "403 from Typeform".
- Auth errors MUST name the missing scope and tell the user where to configure it (e.g. "Your Typeform token is missing the 'forms:read' scope. Update it at admin.typeform.com → User Settings → Personal tokens").

## Validation commands

```bash
pnpm run build          # type-check via attio build
pnpm run lint           # eslint
pnpm run lint:fix       # eslint --fix
pnpm run format:check   # prettier check
pnpm run format         # prettier write
pnpm run test           # vitest run
pnpm run knip           # dead code check
```
