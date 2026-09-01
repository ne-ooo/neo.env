---
name: anti-patterns
description: Common mistakes when using neo.env — expansion is opt-in, override defaults to false, $VAR only matches uppercase, unresolved variables stay literal, expansion limits throw, email validation is simple regex, JSON requires strict syntax, load file errors throw
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
---

# Anti-Patterns for @lpm.dev/neo.env

### [CRITICAL] Variable expansion is opt-in — disabled by default

Wrong:

```typescript
// .env file:
// HOST=localhost
// PORT=5432
// DATABASE_URL=postgres://$HOST:$PORT/mydb

const { parsed } = await load()
console.log(parsed.DATABASE_URL)
// 'postgres://$HOST:$PORT/mydb' — variables NOT expanded!
```

Correct:

```typescript
// Enable expansion explicitly
const { parsed } = await load({ expand: true })
console.log(parsed.DATABASE_URL)
// 'postgres://localhost:5432/mydb' ✓
```

Unlike dotenv-expand (which auto-expands in some configurations), neo.env requires `expand: true` in load options. This is the most common mistake — AI agents trained on dotenv-expand assume expansion is automatic.

Source: `src/core/loader.ts` — expansion only runs when `options.expand === true`

### [CRITICAL] Override defaults to false — existing env vars are preserved

Wrong:

```typescript
// process.env.PORT is already '8080' (set by Docker/CI)
// .env file has PORT=3000

const { parsed } = await load()
console.log(process.env.PORT)
// '8080' — .env value was ignored!
// parsed.PORT is '3000' but process.env.PORT is still '8080'
```

Correct:

```typescript
// If you want .env to take precedence over existing env vars:
const { parsed } = await load({ override: true })
console.log(process.env.PORT)
// '3000' ✓

// Default behavior is intentional — system env vars should take precedence
// in production (Docker, CI, cloud platforms set env vars directly)
```

By default, `load()` and `loadSync()` do not overwrite variables that already exist in `process.env`. This is the same behavior as dotenv. Use `override: true` only when you specifically want `.env` file values to take precedence.

Source: `src/core/loader.ts` — the loader uses `override` to build the effective environment

### [HIGH] `$VAR` syntax only matches uppercase variable names

Wrong:

```typescript
// .env file:
// host=localhost
// url=http://$host:3000

const { parsed } = await load({ expand: true })
console.log(parsed.url)
// 'http://$host:3000' — $host NOT expanded (lowercase)
```

Correct:

```typescript
// Option 1: Use uppercase variable names with $VAR syntax
// HOST=localhost
// URL=http://$HOST:3000

// Option 2: Use ${var} syntax (supports any case)
// host=localhost
// url=http://${host}:3000

const { parsed } = await load({ expand: true })
console.log(parsed.url)
// 'http://localhost:3000' ✓
```

The `$VAR` syntax uses the regex pattern `[A-Z_][A-Z0-9_]*` — only uppercase letters, digits, and underscores. The `${VAR}` syntax has no case restriction and supports any variable name. If your `.env` uses lowercase keys, always use `${var}` syntax for interpolation.

Source: `src/core/expander.ts` — `$VAR` regex vs `${VAR}` regex patterns

### [HIGH] Unresolved variables are left as literal text

Wrong:

```typescript
// .env file:
// API_URL=https://${API_HOST}/v1
// (API_HOST is not defined anywhere)

const { parsed } = await load({ expand: true })
console.log(parsed.API_URL)
// 'https://${API_HOST}/v1' — literal ${API_HOST} in the string!
// No error thrown, no warning
```

Correct:

```typescript
// Option 1: Provide a default value
// API_URL=https://${API_HOST:-api.example.com}/v1

// Option 2: Validate after loading to catch missing variables
import { load, validate } from '@lpm.dev/neo.env'

const { parsed } = await load({ expand: true })
const { valid, errors } = validate(parsed, {
  API_URL: { type: 'url', required: true },
})
// Catches invalid URL caused by unexpanded variable
```

When a variable reference cannot be resolved (not in parsed values, not in `process.env`, no default provided), it is left as the literal string `${VAR}` or `$VAR`. No error is thrown. Always use `${VAR:-default}` syntax or validate after expansion to catch missing variables.

Source: `src/core/expander.ts` — unresolved references returned unchanged

### [HIGH] File not found throws an error — not a silent no-op

Wrong:

```typescript
// AI assumes missing .env is silently ignored (like some dotenv setups)
const { parsed } = await load({ path: '.env.local' })
// Throws: ENOENT: no such file or directory
```

Correct:

```typescript
import { load } from '@lpm.dev/neo.env'
import { existsSync } from 'node:fs'

// Check before loading
if (existsSync('.env.local')) {
  await load({ path: '.env.local' })
}

// Or catch the error
try {
  await load({ path: '.env.local' })
} catch {
  // .env.local doesn't exist — use defaults or process.env only
}
```

Both `load()` and `loadSync()` throw when the file is not found. This differs from some dotenv configurations that silently ignore missing files. Always handle the error or check file existence before loading.

Use `config()` when you need the dotenv-compatible `{ parsed, error }` result.

Source: `src/core/loader.ts` — `fs.readFileSync` / `fs.promises.readFile` without try/catch

### [MEDIUM] Partial loading requires explicit permission

Wrong:

```typescript
await load({ allowPartial: true })
// Valid entries change the environment when another entry has a format error.
```

Correct:

```typescript
const { errors } = await load()

if (errors.length > 0) {
  // The environment is unchanged.
}
```

`load()` and `loadSync()` are atomic for format errors by default. If partial changes are safe, use `allowPartial: true`.

The dotenv-compatible `config()` function permits partial parsing by default. If atomic behavior is required, use `allowPartial: false`.

Source: `src/core/loader.ts` — `processContent()` returns before expansion and mutation when format errors exist

### [MEDIUM] Recursive expansion rejects cycles and configured limits

Wrong:

```typescript
// .env file with a cycle:
// A=${B}
// B=${A}

const { parsed } = await load({ expand: true })
// Throws ExpansionError with code CYCLE
```

Correct:

```typescript
// Keep variable chains shallow.
HOST=localhost
PORT=5432
DB_URL=postgres://${HOST}:${PORT}/mydb  // 1 level — fine

// Configure the limits when your data needs different values:
const expanded = expand(parsed, {
  maxDepth: 32,
  maxOutputLength: 262144,
  maxTotalOutputLength: 4194304,
  maxExpansionWorkLength: 4194304,
})

// If you don't need recursive expansion:
const nonRecursive = expand(parsed, { recursive: false })
// Only expands one level of references
```

Recursive expansion detects cycles. The default depth is 64. Each value is limited to 1 MiB. Total output and intermediate work are each limited to 16 MiB.

Source: `src/core/expander.ts` — `ExpansionError` reports cycles and exhausted limits

### [MEDIUM] Email validation uses a simple regex — not RFC 5322

Wrong:

```typescript
// AI assumes full email validation
const result = validate(env, {
  EMAIL: { type: 'email', required: true },
})
// Accepts: 'user@example' (no TLD)
// Accepts: 'a@b.c' (single char parts)
// The regex is: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

Correct:

```typescript
// For strict email validation, use a custom transform
const result = validate(env, {
  EMAIL: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
})

// Or use a dedicated email validation library in the transform
```

The `email` type uses a basic regex pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` that checks for `something@something.something`. It does not validate TLD length, special characters, or RFC 5322 compliance. For production email validation, use the `pattern` option with a stricter regex or a `transform` with a dedicated validation library.

Source: `src/core/validator.ts` — email regex pattern

### [MEDIUM] Boolean type only accepts specific values

Wrong:

```typescript
// AI assumes flexible boolean parsing
const result = validate(env, {
  VERBOSE: { type: 'boolean' },
})
// 'yes' → validation error (not accepted)
// 'on'  → validation error (not accepted)
// 'TRUE' → true ✓ (case-insensitive)
// '1'   → true ✓
```

Correct:

```typescript
// Accepted boolean values:
// 'true', 'True', 'TRUE' → true
// 'false', 'False', 'FALSE' → false
// '1' → true
// '0' → false
// Anything else → validation error

// For custom boolean parsing:
const result = validate(env, {
  VERBOSE: {
    type: 'string',
    transform: (v) => ['true', '1', 'yes', 'on'].includes(v.toLowerCase()),
  },
})
```

Boolean coercion only accepts `true`/`false` (case-insensitive) and `1`/`0`. Common values like `yes`/`no`, `on`/`off`, `y`/`n` are rejected. Use a custom `transform` function if you need more flexible boolean parsing.

Source: `src/core/validator.ts` — boolean type handler with strict matching

### [MEDIUM] Inline comments only stripped from unquoted values

Wrong:

```typescript
// .env file:
// KEY="value # not a comment"
// OTHER=value # this IS a comment

const parsed = parse('KEY="value # not a comment"\nOTHER=value # this IS a comment')
parsed.KEY    // 'value # not a comment' (preserved — inside quotes)
parsed.OTHER  // 'value' (comment stripped — unquoted)
```

Correct:

```typescript
// Understand the rule:
// - Quoted values: everything inside quotes is preserved, including #
// - Unquoted values: # and everything after it is treated as a comment

// To include # in an unquoted value — not possible, use quotes:
// KEY="value#with#hashes"
```

The parser strips comments from unquoted values. Inside quoted values, the `#` character is part of the value.

Source: `src/core/parser.ts` — inline comment handling in unquoted value regex
