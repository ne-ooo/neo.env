---
name: getting-started
description: How to import and use neo.env — async/sync .env loading, parse API, variable interpolation with defaults, schema validation with type coercion, dotenv compatibility, LoadOptions, and TypeScript types
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.tsx"
  - "**/*.jsx"
---

# Getting Started with @lpm.dev/neo.env

## Overview

neo.env is a zero-dependency environment variable utility. It supports common dotenv `config()` and `parse()` workflows. It also provides async loading, interpolation, and schema validation.

## Loading .env Files

### Async (recommended)

```typescript
import { load } from '@lpm.dev/neo.env'

const { parsed, errors } = await load()
// Reads .env from current working directory
// Sets variables in process.env

if (errors.length > 0) {
  console.error('Parse errors:', errors)
}
```

### Sync

```typescript
import { loadSync } from '@lpm.dev/neo.env'

const { parsed, errors } = loadSync()
```

### Load options

```typescript
await load({
  path: '.env.production',    // File path (default: '.env')
  encoding: 'utf8',           // File encoding (default: 'utf8')
  override: false,            // Override existing process.env vars (default: false)
  expand: false,              // Enable variable interpolation (default: false)
  allowPartial: false,        // Apply valid entries when format errors exist
})
```

By default, `load()` and `loadSync()` do not change the environment when format errors exist. Use `allowPartial: true` to apply valid entries.

### Dotenv compatibility

```typescript
import env from '@lpm.dev/neo.env'

// Dotenv-compatible config result
const { parsed, error } = env.config()
await env.configAsync()       // Async neo.env API
```

`config()` permits partial parsing by default for dotenv compatibility. Use `allowPartial: false` to prevent partial changes.

## Parsing .env Content

```typescript
import { parse, parseDetailed } from '@lpm.dev/neo.env'

const content = `
# Database config
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp

# API keys
API_KEY="sk-abc123"
SECRET='my secret value'
`

const parsed = parse(content)
// parsed: { DB_HOST: 'localhost', DB_PORT: '5432', DB_NAME: 'myapp', API_KEY: 'sk-abc123', SECRET: 'my secret value' }

const detailed = parseDetailed(content)
// detailed: { parsed, errors }
// error: { code: 'INVALID_ENTRY', line, message: 'Invalid environment entry' }
```

Format-error messages do not contain source values.

### Supported syntax

```bash
# Comments (full-line)
KEY=value                     # Basic key-value
KEY = value                   # Whitespace around = is trimmed
KEY=value # inline comment    # Inline comments (unquoted values only)

# Quoted values (preserve spaces, #, and special chars)
KEY="double quoted"
KEY='single quoted'
KEY=`backtick quoted`

# Double-quoted \n and \r sequences become line breaks
LINES="line1\nline2\rline3"

# Other backslash sequences remain unchanged
TAB="tab\there"

# Export prefix (ignored)
export KEY=value              # Same as KEY=value

# Empty values
KEY=                          # Empty string
```

## Variable Interpolation

Enable with `expand: true` in load options, or use the `expand()` function directly:

```typescript
import { load, expand } from '@lpm.dev/neo.env'

// Via load options
await load({ expand: true })

// Or manually
import { parse, expand } from '@lpm.dev/neo.env'
const parsed = parse(content)
const expanded = expand(parsed)
```

### Expansion syntax

```bash
# .env file
HOST=localhost
PORT=5432

# $VAR syntax (uppercase only)
DB_URL=postgres://$HOST:$PORT/mydb

# ${VAR} syntax (any case)
DB_URL=postgres://${HOST}:${PORT}/mydb

# ${VAR:-default} syntax (with fallback)
DB_URL=postgres://${HOST:-localhost}:${PORT:-5432}/${DB_NAME:-myapp}
```

### Expansion behavior

- **Lookup order**: parsed values (first) → `process.env` → default value
- **Recursive expansion**: Enabled by default, max depth 64
- **Cycle handling**: Cycles throw `ExpansionError`
- **Output limit**: Each expanded value is limited to 1,048,576 characters
- **Unresolved variables**: Left as-is if not found and no default
- **`$VAR` syntax**: Only matches uppercase variable names (`[A-Z_][A-Z0-9_]*`)
- **`${VAR}` syntax**: Matches any variable name (no case restriction)

When `load()` expands values, it applies `override` first. Existing environment values win when `override` is `false`.

```typescript
// Disable recursive expansion
const nonRecursive = expand(parsed, { recursive: false })

// Provide custom process.env lookup
const customEnvironment = expand(parsed, { processEnv: { HOST: 'custom.host' } })

// Configure safety limits
const limited = expand(parsed, { maxDepth: 32, maxOutputLength: 262144 })
```

## Schema Validation

Validate and coerce environment variables against a typed schema:

```typescript
import { validate } from '@lpm.dev/neo.env'

const result = validate(process.env, {
  PORT: { type: 'number', required: true },
  HOST: { type: 'string', default: 'localhost' },
  DEBUG: { type: 'boolean', default: 'false' },
  DATABASE_URL: { type: 'url', required: true },
  ADMIN_EMAIL: { type: 'email', required: true },
  CONFIG: { type: 'json' },
  LOG_LEVEL: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
  API_KEY: { type: 'string', pattern: /^sk-/ },
  TIMEOUT: { type: 'number', transform: (v) => parseInt(v) * 1000 },
})

if (!result.valid) {
  console.error('Config errors:', result.errors)
  process.exit(1)
}

// result.values has coerced types
const port: number = result.values.PORT       // 3000 (not '3000')
const debug: boolean = result.values.DEBUG    // false (not 'false')
```

### Type coercion

| Type | Input | Output |
|------|-------|--------|
| `string` | `'hello'` | `'hello'` (no change) |
| `number` | `'3000'`, `'1.5e2'` | `3000`, `150` |
| `boolean` | `'true'`, `'false'`, `'1'`, `'0'` | `true`, `false` (case-insensitive) |
| `url` | `'https://example.com'` | `'https://example.com'` (validated via `new URL()`) |
| `email` | `'user@example.com'` | `'user@example.com'` (validated via regex) |
| `json` | `'{"key":"val"}'` | `{ key: 'val' }` (parsed via `JSON.parse()`) |

Number validation rejects hexadecimal, binary, octal, and non-finite values.

### Schema field options

```typescript
{
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json',
  required?: boolean,        // Fail if missing
  default?: string,          // Use if missing (as string, then coerced)
  enum?: string[],           // Must be one of these values
  pattern?: RegExp,          // Must match this regex
  transform?: (value: string) => unknown,  // Custom transformation
}
```

`validate()` infers each output type from the schema literal.
Required fields and fields with defaults are required in the output type.
Other fields are optional.
The return type of `transform` takes priority over `type`.
JSON output is `unknown` until application code narrows it.

## Complete Pipeline

```typescript
import { load, validate } from '@lpm.dev/neo.env'

// 1. Load and expand .env
const { parsed, errors: parseErrors } = await load({
  path: '.env',
  expand: true,
})

// 2. Validate and coerce
const { valid, errors: validationErrors, values } = validate(parsed, {
  PORT: { type: 'number', required: true },
  NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'] },
  DATABASE_URL: { type: 'url', required: true },
  DEBUG: { type: 'boolean', default: 'false' },
})

if (!valid) {
  console.error('Invalid config:', validationErrors)
  process.exit(1)
}

// 3. Use typed values
startServer(values.PORT, values.DATABASE_URL)
```

## TypeScript Types

```typescript
import type {
  LoadOptions,        // File, override, partial-load, expansion, environment, and limit options
  LoadResult,         // { parsed, errors }
  ParseOptions,       // { debug?, multiline? }
  ParseResult,        // { parsed, errors }
  ParseError,         // { code, line, message }
  ExpandOptions,      // { processEnv?, parsed?, recursive?, maxDepth?, maxOutputLength? }
  Schema,             // Record<string, SchemaField>
  SchemaField,        // { type?, required?, default?, enum?, pattern?, transform? }
  InferSchema,        // Output values inferred from a schema
  InferSchemaField,   // Output value inferred from one schema field
  ValidationResult,   // { valid, errors, values }
  ValidationError,    // { key, message }
} from '@lpm.dev/neo.env'
```
