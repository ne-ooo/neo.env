---
name: migrate-from-dotenv
description: Step-by-step guide for migrating common dotenv config() workflows to neo.env, with variable expansion, schema validation, async API, import changes, and a migration checklist
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
---

# Migrate from dotenv to @lpm.dev/neo.env

## Quick Comparison

| Aspect | dotenv | dotenv + dotenv-expand + envalid | neo.env |
|--------|--------|----------------------------------|---------|
| Packages needed | 1 | 3 | 1 |
| Bundle size | ~6 KB | ~15 KB combined | 19.8 KiB main ESM |
| Dependencies | 0 | 2+ | 0 |
| Async API | No | No | Yes (`load()`) |
| Variable expansion | No (needs dotenv-expand) | Yes (separate package) | Yes (built-in) |
| Default values (`${VAR:-default}`) | No | Partial | Yes |
| Schema validation | No (needs envalid/zod) | Yes (separate package) | Yes (built-in) |
| Type coercion | No | Via envalid | Yes (number, boolean, url, email, json) |
| TypeScript | Ambient types | Mixed | Native strict mode |
| Performance | Baseline | N/A | Measured in five local trials |

## Step 1: Replace the Config API

For common config workflows, change the import:

```typescript
// Before (dotenv)
import dotenv from 'dotenv'
dotenv.config()

// After (neo.env) — compatible config() contract
import env from '@lpm.dev/neo.env'
env.config()
```

Or with named imports:

```typescript
// Before (dotenv)
import { config } from 'dotenv'
config()

// After (neo.env)
import { config } from '@lpm.dev/neo.env'
config()
```

Both APIs read `.env` from the current directory. They preserve existing `process.env` values by default.

`config()` keeps dotenv partial parsing. The native `load()` and `loadSync()` APIs do not change the environment when format errors exist.

## Step 2: Replace dotenv-expand

If you use `dotenv-expand` for variable interpolation, neo.env has it built-in:

```typescript
// Before (dotenv + dotenv-expand)
import dotenv from 'dotenv'
import { expand } from 'dotenv-expand'
const env = dotenv.config()
expand(env)

// After (neo.env) — single call
import { load } from '@lpm.dev/neo.env'
await load({ expand: true })

// Or sync
import { loadSync } from '@lpm.dev/neo.env'
loadSync({ expand: true })
```

### Additional expansion feature: default values

```bash
# dotenv-expand — no default value syntax
DATABASE_URL=postgres://${DB_HOST}:${DB_PORT}/mydb
# If DB_HOST is missing → postgres://:5432/mydb (empty)

# neo.env — ${VAR:-default} syntax
DATABASE_URL=postgres://${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-mydb}
# If DB_HOST is missing → postgres://localhost:5432/mydb ✓
```

## Step 3: Replace envalid/zod Validation

If you use a separate validation package, neo.env has schema validation built-in:

```typescript
// Before (dotenv + envalid)
import dotenv from 'dotenv'
import { cleanEnv, str, num, bool, url } from 'envalid'

dotenv.config()
const env = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  HOST: str({ default: 'localhost' }),
  DEBUG: bool({ default: false }),
  DATABASE_URL: url(),
})

// After (neo.env)
import { load, validate } from '@lpm.dev/neo.env'

await load({ expand: true })
const { valid, errors, values } = validate(process.env, {
  PORT: { type: 'number', default: '3000' },
  HOST: { type: 'string', default: 'localhost' },
  DEBUG: { type: 'boolean', default: 'false' },
  DATABASE_URL: { type: 'url', required: true },
})

if (!valid) {
  console.error('Config errors:', errors)
  process.exit(1)
}

// values.PORT is number, values.DEBUG is boolean, etc.
```

### Type mapping

| envalid | neo.env |
|---------|---------|
| `str()` | `{ type: 'string' }` |
| `num()` | `{ type: 'number' }` |
| `bool()` | `{ type: 'boolean' }` |
| `url()` | `{ type: 'url' }` |
| `email()` | `{ type: 'email' }` |
| `json()` | `{ type: 'json' }` |
| `port()` | `{ type: 'number', pattern: /^[0-9]+$/ }` |
| Custom validator | `{ transform: (v) => ... }` |

### Differences from envalid

- **Default values**: neo.env defaults are strings (coerced after), envalid defaults are typed
- **Error handling**: neo.env collects validation errors, while envalid throws on the first error
- **Custom reporters**: Not supported in neo.env (use the `errors` array directly)
- **Middleware**: Not supported — use `transform` for custom processing

## Step 4: Use the Async API (Optional)

neo.env provides a non-blocking async API that dotenv does not have:

```typescript
// Before (dotenv) — always synchronous, blocks event loop
import dotenv from 'dotenv'
dotenv.config()

// After (neo.env) — async, non-blocking
import { load, validate } from '@lpm.dev/neo.env'
await load()

// Or in app startup
async function bootstrap() {
  await load({ expand: true })

  const result = validate(process.env, schema)
  if (!result.valid) {
    throw new Error('Invalid environment configuration')
  }
  return startServer(result.values)
}
```

## Step 5: Load Options Mapping

```typescript
// dotenv options → neo.env options
dotenv.config({
  path: '.env.local',          // ✓ Same: path
  encoding: 'latin1',          // ✓ Same: encoding
  override: true,              // ✓ Same: override
})

// neo.env equivalent
loadSync({
  path: '.env.local',
  encoding: 'latin1',
  override: true,
  expand: true,                // NEW: built-in expansion (opt-in)
  allowPartial: false,         // NEW: atomic format-error handling
})
```

## Step 6: Parse API

```typescript
// Before (dotenv)
import { parse } from 'dotenv'
const parsed = parse('KEY=value\nOTHER=data')
// Returns: { KEY: 'value', OTHER: 'data' }

// After (neo.env) — same result shape
import { parse } from '@lpm.dev/neo.env'
const parsed = parse('KEY=value\nOTHER=data')
// Returns: { KEY: 'value', OTHER: 'data' }

// Use the detailed API for line-numbered errors
import { parseDetailed } from '@lpm.dev/neo.env'
const { parsed: detailed, errors } = parseDetailed('KEY=value\nOTHER=data')
```

## What's NOT in neo.env

| dotenv feature | neo.env |
|---------------|---------|
| `dotenv.populate()` | Not supported — use `parse()` + manual assignment |
| Multiple file loading | Load files sequentially with multiple `load()` calls |
| `.env.vault` encrypted files | Not supported |
| `DOTENV_KEY` decryption | Not supported |

## Migration Checklist

- [ ] Replace `import dotenv from 'dotenv'` with `import env from '@lpm.dev/neo.env'` (or named imports)
- [ ] Replace `dotenv.config()` with `env.config()` or named `config()`
- [ ] Remove `dotenv-expand` — use `load({ expand: true })` instead
- [ ] Remove `envalid` / validation package — use `validate()` instead
- [ ] Add `{ expand: true }` to load options if you were using dotenv-expand
- [ ] Convert envalid validators to neo.env schema fields
- [ ] Consider switching to async `load()` for non-blocking startup
- [ ] If you use `load()` or `loadSync()`, handle file errors
- [ ] Remove `dotenv`, `dotenv-expand`, `envalid`, `@types/dotenv` from dependencies
- [ ] Add `@lpm.dev/neo.env` to dependencies
