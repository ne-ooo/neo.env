# @lpm.dev/neo.env

> Zero-dependency environment variable utility - Fast, modern alternative to dotenv

## Features

✅ **Zero dependencies** - Completely self-contained
✅ **Async/Await API** - Non-blocking file I/O
✅ **Variable interpolation** - `$VAR` and `${VAR:-default}` syntax
✅ **Schema validation** - Type coercion and validation
✅ **100% dotenv compatible** - Drop-in replacement
✅ **TypeScript-first** - Full type safety with strict mode
✅ **ESM + CommonJS** - Works everywhere
✅ **Fast** - Competitive performance with dotenv
✅ **Small** - ~8KB bundle size

## Installation

```bash
lpm install @lpm.dev/neo.env
```

## Quick Start

Create a `.env` file in your project root:

```bash
# .env
PORT=3000
DATABASE_URL=postgres://localhost:5432/mydb
API_KEY=secret123
```

Load it in your application:

```typescript
import "@lpm.dev/neo.env/config"; // Auto-loads .env

console.log(process.env.PORT); // '3000'
```

Or use the async API:

```typescript
import { load } from "@lpm.dev/neo.env";

await load();
console.log(process.env.PORT); // '3000'
```

## API Reference

### `load(options?)` (async)

Asynchronously load and parse a .env file.

```typescript
import { load } from "@lpm.dev/neo.env";

const result = await load({
  path: ".env", // File path (default: '.env')
  encoding: "utf8", // File encoding
  override: false, // Override existing env vars
  expand: false, // Enable variable interpolation
});

console.log(result.parsed); // { PORT: '3000', ... }
console.log(result.errors); // Any parsing errors
```

### `loadSync(options?)`

Synchronously load and parse a .env file (dotenv compatibility).

```typescript
import { loadSync } from "@lpm.dev/neo.env";

const result = loadSync({ path: ".env" });
```

### `parse(content, options?)`

Parse .env file content into key-value pairs.

```typescript
import { parse } from "@lpm.dev/neo.env";

const result = parse("KEY=value\nFOO=bar");
console.log(result.parsed); // { KEY: 'value', FOO: 'bar' }
```

### `expand(parsed, options?)`

Expand variable references in parsed environment variables.

```typescript
import { expand } from "@lpm.dev/neo.env";

const parsed = {
  HOST: "localhost",
  PORT: "3000",
  URL: "http://${HOST}:${PORT}",
};

const expanded = expand(parsed);
console.log(expanded.URL); // 'http://localhost:3000'
```

### `validate(parsed, schema)`

Validate and coerce environment variables against a schema.

```typescript
import { validate } from "@lpm.dev/neo.env";

const schema = {
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean", default: "false" },
  NODE_ENV: { enum: ["development", "production", "test"] },
  API_URL: { type: "url", required: true },
};

const result = validate(parsed, schema);

if (result.valid) {
  console.log(result.values.PORT); // number, not string!
} else {
  console.error(result.errors);
}
```

## Variable Interpolation

Neo.env supports variable interpolation out of the box:

```bash
# .env
HOST=localhost
PORT=3000
DATABASE_PORT=5432

# Simple interpolation
API_URL=http://${HOST}:${PORT}/api

# With defaults
BASE_URL=${API_BASE:-http://localhost:3000}

# Nested references
DATABASE_URL=postgres://${HOST}:${DATABASE_PORT}/mydb
FULL_API_URL=${BASE_URL}/api/v1
```

Enable interpolation when loading:

```typescript
await load({ expand: true });

console.log(process.env.API_URL); // 'http://localhost:3000/api'
console.log(process.env.BASE_URL); // 'http://localhost:3000' (used default)
```

### Syntax

- `$VAR` - Simple variable reference (uppercase only)
- `${VAR}` - Explicit variable reference
- `${VAR:-default}` - Variable with default value

Variables are looked up in this order:

1. Parsed .env values
2. Existing `process.env`
3. Default value (if provided)

## Schema Validation

Validate and coerce environment variables for type safety:

```typescript
import { load, validate } from "@lpm.dev/neo.env";

const { parsed } = await load();

const schema = {
  // Type coercion
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean" },

  // Validation
  NODE_ENV: {
    enum: ["development", "production", "test"],
    default: "development",
  },

  // URL validation
  API_URL: { type: "url", required: true },

  // Email validation
  ADMIN_EMAIL: { type: "email" },

  // JSON parsing
  FEATURES: { type: "json" },

  // Pattern matching
  VERSION: { pattern: /^v\d+\.\d+\.\d+$/ },

  // Custom transform
  TAGS: {
    transform: (value) => value.split(",").map((s) => s.trim()),
  },
};

const result = validate(parsed, schema);

if (!result.valid) {
  console.error("Invalid environment:", result.errors);
  process.exit(1);
}

// Use validated, coerced values
const config = result.values;
console.log(typeof config.PORT); // 'number'
console.log(typeof config.DEBUG); // 'boolean'
console.log(Array.isArray(config.TAGS)); // true
```

### Schema Types

- `string` - String value (default)
- `number` - Coerce to number
- `boolean` - Coerce to boolean (`true`/`false`, `1`/`0`)
- `url` - Validate URL format
- `email` - Validate email format
- `json` - Parse JSON value

### Schema Options

- `type` - Value type
- `required` - Field must be present
- `default` - Default value if not provided
- `enum` - Allowed values
- `pattern` - RegExp pattern to match
- `transform` - Custom transformation function

## .env File Syntax

```bash
# Comments start with #
# Empty lines are ignored

# Basic key=value
KEY=value

# Quoted values
SINGLE='single quoted'
DOUBLE="double quoted"
BACKTICK=`backtick quoted`

# Escape sequences in quotes
MULTILINE="line1\nline2"
TABS="col1\tcol2"
QUOTES="He said \"hello\""

# Inline comments (unquoted values only)
KEY=value # this is a comment

# export prefix (ignored)
export EXPORTED_VAR=value

# Whitespace is trimmed
  TRIMMED  =  value

# Variable interpolation (requires expand: true)
HOST=localhost
PORT=3000
URL=http://${HOST}:${PORT}
```

## Dotenv Compatibility

Neo.env is a drop-in replacement for dotenv:

```typescript
// Before (dotenv)
import dotenv from "dotenv";
dotenv.config();

// After (neo.env) - exact same API
import dotenv from "@lpm.dev/neo.env";
dotenv.config();

// Or use named import
import { loadSync } from "@lpm.dev/neo.env";
loadSync();
```

Additional methods:

```typescript
import dotenv from "@lpm.dev/neo.env";

// Async version
await dotenv.configAsync();

// Parse .env content
const parsed = dotenv.parse("KEY=value");

// Expand variables
const expanded = dotenv.expand({ HOST: "localhost", URL: "${HOST}" });

// Validate with schema
const validated = dotenv.validate(parsed, schema);
```

## Migration from dotenv

### Step 1: Replace dependency

```bash
lpm install @lpm.dev/neo.env
```

### Step 2: Update imports

```typescript
// Before
import dotenv from "dotenv";
// or
const dotenv = require("dotenv");

// After
import dotenv from "@lpm.dev/neo.env";
// or
const dotenv = require("@lpm.dev/neo.env");
```

### Step 3: (Optional) Use new features

```typescript
// Use async API
await dotenv.configAsync();

// Enable variable interpolation
dotenv.config({ expand: true });

// Add schema validation
const { parsed } = dotenv.config();
const result = dotenv.validate(parsed, schema);
```

That's it! All existing dotenv code continues to work.

## TypeScript

Neo.env is written in TypeScript and provides full type definitions:

```typescript
import type {
  LoadOptions,
  LoadResult,
  ParseResult,
  Schema,
  ValidationResult,
} from "@lpm.dev/neo.env";

// Type-safe configuration
const options: LoadOptions = {
  path: ".env",
  expand: true,
};

const result: LoadResult = await load(options);

// Type-safe schema
const schema: Schema = {
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean" },
};

const validation: ValidationResult = validate(result.parsed, schema);
```

## Performance

Neo.env is designed for performance:

- **~1.24x faster** than dotenv for small files
- **Competitive** performance for large files
- **Modern regex** instead of stateful parsing
- **Single-pass parsing** for efficiency

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed performance comparison.

## Bundle Size

- **ESM**: 7.9 KB
- **CommonJS**: 8.1 KB
- **Types**: 2.9 KB

Despite having more features than dotenv (async API, variable interpolation, schema validation), neo.env maintains a small bundle size.

## Examples

### Basic Usage

```typescript
import { load } from "@lpm.dev/neo.env";

await load();
console.log(process.env.DATABASE_URL);
```

### With Variable Interpolation

```typescript
// .env
// DB_HOST=localhost
// DB_PORT=5432
// DATABASE_URL=postgres://${DB_HOST}:${DB_PORT}/mydb

await load({ expand: true });
console.log(process.env.DATABASE_URL); // postgres://localhost:5432/mydb
```

### With Schema Validation

```typescript
const { parsed } = await load();

const schema = {
  PORT: { type: "number", required: true },
  NODE_ENV: { enum: ["development", "production"] },
};

const result = validate(parsed, schema);
if (!result.valid) {
  throw new Error(`Invalid config: ${JSON.stringify(result.errors)}`);
}

const config = result.values;
startServer(config.PORT); // TypeScript knows PORT is a number!
```

### Multiple Environment Files

```typescript
// Load base config
await load({ path: ".env" });

// Override with environment-specific config
await load({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});
```

## FAQ

### Why neo.env instead of dotenv?

Neo.env modernizes dotenv with:

- Native TypeScript support
- Async/await API
- Variable interpolation
- Schema validation
- Similar or better performance
- Zero dependencies

### Is it compatible with dotenv?

Yes! 100% compatible. It's a drop-in replacement.

### Can I use it in production?

Yes! Neo.env is production-ready with:

- 97 passing tests
- 100% type coverage
- Comprehensive error handling
- Battle-tested parsing logic

### Does it support multiline values?

Yes, use quoted values:

```bash
MULTILINE="line1\nline2\nline3"
```

### How do I disable variable expansion?

Don't pass `expand: true` to load options. Expansion is opt-in.

## License

MIT
