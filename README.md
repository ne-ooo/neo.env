# @lpm.dev/neo.env

`@lpm.dev/neo.env` parses, loads, expands, and validates environment variables
in Node.js.

## Features

- **File loading:** Provides asynchronous, synchronous, and auto-load entry
  points.
- **Expansion:** Supports `$VAR`, `${VAR}`, and `${VAR:-default}` syntax with
  finite work limits.
- **Schema validation:** Coerces values and applies required fields, defaults,
  enums, patterns, and trusted transforms.
- **Dotenv compatibility:** Supports common `config()` and `parse()` contracts.
- **TypeScript support:** Includes strict declarations and schema inference.
- **Dependency surface:** Has no runtime dependencies.

## Install

Install the package with LPM:

```bash
lpm install @lpm.dev/neo.env
```

## Quick start

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

console.log(process.env.PORT); // "3000"
```

Or use the async API:

```typescript
import { load } from "@lpm.dev/neo.env";

await load();
console.log(process.env.PORT); // "3000"
```

## API

### `load(options?)` (async)

Loads and parses a `.env` file asynchronously.

```typescript
import { load } from "@lpm.dev/neo.env";

const result = await load({
  path: ".env", // File path (default: ".env")
  encoding: "utf8", // File encoding
  override: false, // Override existing env vars
  expand: false, // Enable variable interpolation
  recursive: true, // Expand nested references
  maxDepth: 64, // Maximum reference depth (hard limit: 256)
  maxOutputLength: 1048576, // Maximum characters per value
  maxTotalOutputLength: 16777216, // Maximum characters in all values
  maxExpansionWorkLength: 16777216, // Maximum intermediate expansion work
  allowPartial: false, // Apply valid entries when format errors exist
});

console.log(result.parsed); // { PORT: "3000", ... }
console.log(result.errors); // Any format errors
```

`load()` and `loadSync()` do not change the target environment when format
errors exist. Set `allowPartial: true` to apply valid entries.

### `loadSync(options?)`

Loads and parses a `.env` file synchronously. File errors throw.

```typescript
import { loadSync } from "@lpm.dev/neo.env";

const result = loadSync({ path: ".env" });
```

### `config(options?)`

Loads a `.env` file with the dotenv-compatible result contract.

```typescript
import { config } from "@lpm.dev/neo.env";

const { parsed, error } = config({ path: ".env" });
if (error) console.error(error);
```

`config()` permits partial parsing by default for dotenv compatibility. Set
`allowPartial: false` to prevent partial changes.

### `parse(content)`

Parses a string or buffer with the dotenv-compatible result contract.

```typescript
import { parse } from "@lpm.dev/neo.env";

const parsed = parse("KEY=value\nFOO=bar");
console.log(parsed); // { KEY: "value", FOO: "bar" }
```

If you need line-numbered format errors, use `parseDetailed()`:

```typescript
import { parseDetailed } from "@lpm.dev/neo.env";

const { parsed, errors } = parseDetailed("KEY=value\nINVALID ENTRY");
// errors[0]: { code: "INVALID_ENTRY", line: 2, message: "Invalid environment entry" }
```

Format-error messages do not contain source values. Detailed parsing retains at
most 100 individual errors. If more errors exist, the final diagnostic uses the
`TOO_MANY_ERRORS` code.

### `expand(parsed, options?)`

Expands variable references in parsed environment variables.

```typescript
import { expand } from "@lpm.dev/neo.env";

const parsed = {
  HOST: "localhost",
  PORT: "3000",
  URL: "http://${HOST}:${PORT}",
};

const expanded = expand(parsed);
console.log(expanded.URL); // "http://localhost:3000"
```

### `validate(parsed, schema)`

Validates and coerces environment variables against a schema.

```typescript
import { type Schema, validate } from "@lpm.dev/neo.env";

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

## Behavior and limits

### Variable expansion

The package supports these variable references:

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

To expand variables during loading, set `expand` to `true`:

```typescript
await load({ expand: true });

console.log(process.env.API_URL); // "http://localhost:3000/api"
console.log(process.env.BASE_URL); // "http://localhost:3000" (used default)
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

The loader applies `override` before expansion. Existing environment values
remain authoritative when `override` is `false`.

Recursive expansion detects cycles. It limits each value to 1 MiB, all returned
values to 16 MiB, and intermediate expansion work to 16 MiB by default.

Use `maxOutputLength`, `maxTotalOutputLength`, and `maxExpansionWorkLength` to
change these limits. `maxDepth` has a hard limit of 256.

The package rejects `__proto__` keys. This rule prevents unsafe behavior when an
application copies returned records to ordinary JavaScript objects.

### Schema validation

Use a schema to validate and coerce environment variables:

```typescript
import { load, type Schema, validate } from "@lpm.dev/neo.env";

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
console.log(typeof config.PORT); // "number"
console.log(typeof config.DEBUG); // "boolean"
console.log(Array.isArray(config.TAGS)); // true
```

Schema code is trusted application code. Patterns and transforms must have
bounded execution time for values that external sources can control.

Transform errors use a stable public message. The package does not add the
thrown exception text because that text can contain environment values.

An own empty string is present and is not replaced by a default. On validation
failure, `values` is typed as a partial result. If `valid` is false, do not use
required values.

#### Schema types

- `string` - String value (default)
- `number` - Coerce a finite decimal value to a number
- `boolean` - Coerce to boolean (`true`/`false`, `1`/`0`)
- `url` - Validate URL format
- `email` - Validate email format
- `json` - Parse JSON value

#### Schema options

- `type` - Value type
- `required` - Field must be present
- `default` - Default value if not provided
- `enum` - Allowed values
- `pattern` - RegExp pattern to match
- `transform` - Custom transformation function

Number validation accepts decimal and exponent syntax. It rejects hexadecimal,
binary, octal, and non-finite values.

### `.env` file syntax

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

### Dotenv compatibility

The package provides compatible `config()` and `parse()` APIs for common dotenv
workflows:

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

The default export also provides these methods:

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

## Migration from `dotenv`

### Replace the dependency

```bash
lpm install @lpm.dev/neo.env
```

### Update imports

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

### Use additional features

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

Run the application tests after the migration.

## TypeScript

The package provides TypeScript declarations and schema inference:

```typescript
import type {
  ConfigResult,
  ExpandOptions,
  InferSchema,
  LoadOptions,
  LoadResult,
  ParseError,
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
const schema = {
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean" },
} satisfies Schema;

type Configuration = InferSchema<typeof schema>;
const validation: ValidationResult<Configuration> = validate(
  result.parsed,
  schema,
);
if (validation.valid) {
  const port: number = validation.values.PORT;
  const debug: boolean | undefined = validation.values.DEBUG;
  void [port, debug];
}
```

## Performance

Five local benchmark trials produced these median results:

- **Three entries**: 2.55 million operations per second
- **100 entries**: 98,978 operations per second
- **Example production file**: 548,383 operations per second
- **Expansion only**: 544,641 operations per second

These values apply only to the recorded hardware and Node.js version. See
[BENCHMARKS.md](./BENCHMARKS.md) for the ranges and method.

Run the benchmark suite:

```bash
lpm run bench
```

### Bundle size

- **ESM**: 20,273 bytes
- **CommonJS**: 22,201 bytes
- **Types**: 5,577 bytes per format

## Examples

### Basic use

```typescript
import { load } from "@lpm.dev/neo.env";

await load();
console.log(process.env.DATABASE_URL);
```

### Variable expansion

```typescript
// .env
// DB_HOST=localhost
// DB_PORT=5432
// DATABASE_URL=postgres://${DB_HOST}:${DB_PORT}/mydb

await load({ expand: true });
console.log(process.env.DATABASE_URL); // postgres://localhost:5432/mydb
```

### Schema validation

```typescript
import { load, type Schema, validate } from "@lpm.dev/neo.env";

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

### Multiple environment files

```typescript
// Load base config
await load({ path: ".env" });

// Override with environment-specific config
await load({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});
```

## Security

Environment files can contain secrets. Do not log source values or validation
input.

The package removes source values from format-error messages. Transform errors
also use a stable public message.

The package rejects `__proto__` keys. Expansion has limits for depth, output
length, total output length, and intermediate work.

Schema patterns and transforms are trusted application code. If an external
source controls values, give these patterns and transforms finite execution
time.

## Runtime support

- **Node.js:** 18 or later
- **Browsers:** Not supported
- **Module formats:** ESM and CommonJS
- **TypeScript:** Declaration files included

## License

MIT. See [LICENSE](./LICENSE).
