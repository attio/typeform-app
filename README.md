# typeform

## `typeform` Attio app

### Build

```bash
pnpm install
```

### Dev Mode

```bash
pnpm run dev
```

### Linting

```bash
pnpm run lint
```

### Tests

```bash
pnpm run test
```

Run them in watch mode while developing:

```bash
pnpm run test:watch
```

Tests run with [Vitest](https://vitest.dev/). The Attio runtime (`attio/server`, `attio/client`)
is only available at build time, so it is aliased to lightweight mocks in `test/mocks/` (see
`vitest.config.ts`).

### Unused code & dependencies

```bash
pnpm run knip
```

[Knip](https://knip.dev/) reports unused files, exports, and dependencies. Its configuration lives
in `knip.json`.
