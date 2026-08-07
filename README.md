# @lpm.dev/neo.env

> Zero-dependency environment variable parser, loader, expander, and validator

## Features

✅ **Zero dependencies** - Completely self-contained
✅ **Async/Await API** - Non-blocking file I/O
✅ **Variable interpolation** - `$VAR` and `${VAR:-default}` syntax
✅ **Schema validation** - Type coercion and validation
✅ **Dotenv-compatible APIs** - Compatible `config()` and `parse()` contracts
✅ **TypeScript-first** - Native types with strict mode
✅ **ESM + CommonJS** - Works everywhere
✅ **Measured** - Five-run parser and expansion benchmarks
✅ **Small** - 14.1 KB ESM main bundle

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
  recursive: true, // Expand nested references
  maxDepth: 64, // Maximum reference depth
  maxOutputLength: 1048576, // Maximum characters per value
  allowPartial: false, // Apply valid entries when format errors exist
});

console.log(result.parsed); // { PORT: '3000', ... }
console.log(result.errors); // Any format errors
```

`load()` and `loadSync()` do not change the target environment when format errors exist. Set `allowPartial: true` to apply valid entries.

### `loadSync(options?)`

Synchronously load and parse a .env file. File errors throw.

```typescript
import { loadSync } from "@lpm.dev/neo.env";

const result = loadSync({ path: ".env" });
```

### `config(options?)`

Load a .env file with the dotenv-compatible result contract.

```typescript
import { config } from "@lpm.dev/neo.env";

const { parsed, error } = config({ path: ".env" });
if (error) console.error(error);
```

`config()` permits partial parsing by default for dotenv compatibility. Set `allowPartial: false` to prevent partial changes.

### `parse(content)`

Parse a string or buffer with the dotenv-compatible result contract.

```typescript
import { parse } from "@lpm.dev/neo.env";

const parsed = parse("KEY=value\nFOO=bar");
console.log(parsed); // { KEY: 'value', FOO: 'bar' }
```

Use `parseDetailed()` when you need line-numbered format errors:

```typescript
import { parseDetailed } from "@lpm.dev/neo.env";

const { parsed, errors } = parseDetailed("KEY=value\nINVALID ENTRY");
// errors[0]: { code: 'INVALID_ENTRY', line: 2, message: 'Invalid environment entry' }
```

Format-error messages do not contain source values.

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
import { validate, type Schema } from "@lpm.dev/neo.env";

const schema = {
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean", default: "false" },
  NODE_ENV: { enum: ["development", "production", "test"] },
  API_URL: { type: "url", required: true },
} satisfies Schema;

const result = validate(parsed, schema);

if (result.valid) {
  console.log(result.values.PORT); // number
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
- `\$VAR` - Literal variable text without expansion

The `expand()` function uses this lookup order:

1. Values in `options.parsed`, or the input record
2. Values in `options.processEnv`, or `process.env`
3. The default value

The loader applies `override` before expansion. Existing environment values remain authoritative when `override` is `false`.

Recursive expansion detects cycles. It also limits depth and output length. Configure these limits with `maxDepth` and `maxOutputLength`.

## Schema Validation

Validate and coerce environment variables for type safety:

```typescript
import { load, validate, type Schema } from "@lpm.dev/neo.env";

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
    transform: (value: string) => value.split(",").map((s) => s.trim()),
  },
} satisfies Schema;

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
- `number` - Coerce a finite decimal value to a number
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

Number validation accepts decimal and exponent syntax. It rejects hexadecimal, binary, octal, and non-finite values.

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

# Double-quoted \n and \r sequences become line breaks
MULTILINE="line1\nline2"

# Other backslash sequences remain unchanged
TABS="col1\tcol2"

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

Neo.env provides compatible `config()` and `parse()` APIs for common dotenv workflows:

```typescript
// Before (dotenv)
import dotenv from "dotenv";
dotenv.config();

// After (neo.env)
import dotenv from "@lpm.dev/neo.env";
dotenv.config();

// Or use named import
import { config } from "@lpm.dev/neo.env";
config();
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
const { parsed = {} } = dotenv.config();
const result = dotenv.validate(parsed, schema);
```

The package does not implement dotenv vault decryption or `populate()`.

## TypeScript

Neo.env is written in TypeScript and provides full type definitions:

```typescript
import type {
  LoadOptions,
  LoadResult,
  ConfigResult,
  ParseError,
  ParseResult,
  ExpandOptions,
  Schema,
  InferSchema,
  ValidationResult,
} from "@lpm.dev/neo.env";

// Type-safe configuration
const options: LoadOptions = {
  path: ".env",
  expand: true,
};

const result: LoadResult = await load(options);

// Type-safe schema
const schema = {
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean" },
} satisfies Schema;

type Configuration = InferSchema<typeof schema>;
const validation: ValidationResult<Configuration> = validate(result.parsed, schema);
const port: number = validation.values.PORT;
const debug: boolean | undefined = validation.values.DEBUG;
```

## Performance

Five local benchmark trials produced these median parser results:

- **Three entries**: 2.55 million operations per second
- **100 entries**: 98,978 operations per second
- **Example production file**: 548,383 operations per second
- **Expansion only**: 544,641 operations per second

These values apply only to the recorded hardware and Node.js version.
See [BENCHMARKS.md](./BENCHMARKS.md) for the ranges and method.

## Bundle Size

- **ESM**: 14,459 bytes
- **CommonJS**: 16,387 bytes
- **Types**: 5,458 bytes per format

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
import { load, validate, type Schema } from "@lpm.dev/neo.env";

const { parsed } = await load();

const schema = {
  PORT: { type: "number", required: true },
  NODE_ENV: { enum: ["development", "production"] },
} satisfies Schema;

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

The `config()` and `parse()` APIs support common dotenv workflows. Vault decryption and `populate()` are not supported.

### Can I use it in production?

Yes! Neo.env is production-ready with:

- 119 automated tests
- Strict TypeScript checks
- ESM and CommonJS package tests
- Differential parser tests against dotenv

### Does it support multiline values?

Yes, use quoted values:

```bash
MULTILINE="line1\nline2\nline3"
```

### How do I disable variable expansion?

Do not pass `expand: true` to load options. Expansion is opt-in.

## License

MIT
