# @lpm.dev/neo.env - Future Enhancements

Potential features and improvements for future versions.

## High Priority Features

### 1. Encrypted .env Files (.env.vault)

**Status**: Not implemented
**Priority**: High
**Effort**: Medium

Support for encrypted environment files:

```typescript
import { load } from "@lpm.dev/neo.env";

await load({
  path: ".env.vault",
  decryptionKey: process.env.DOTENV_KEY,
});
```

**Benefits**:

- Secure secrets in version control
- Compatible with dotenv-vault
- Easy key rotation

**Considerations**:

- Need crypto implementation (Node built-in or zero-dep)
- Key management strategy
- ~150 LOC addition

---

### 2. Multiple Environment Files

**Status**: Not implemented
**Priority**: High
**Effort**: Low

Load multiple .env files with priority:

```typescript
await load({
  paths: [
    ".env", // Base configuration
    `.env.${process.env.NODE_ENV}`, // Environment-specific
    ".env.local", // Local overrides
  ],
  cascade: true, // Later files override earlier ones
});
```

**Benefits**:

- Environment-specific configuration
- Local development overrides
- Simplified configuration management

**Considerations**:

- ~50 LOC addition
- Need clear override semantics
- Documentation overhead

---

### 3. Watch Mode (Auto-reload)

**Status**: Not implemented
**Priority**: Medium
**Effort**: Medium

Automatically reload when .env file changes:

```typescript
import { watch } from "@lpm.dev/neo.env";

const watcher = watch(".env", {
  onChange: (changes) => {
    console.log("Environment changed:", changes);
    // Notify application to reload
  },
});

// Later
watcher.stop();
```

**Benefits**:

- Hot reload in development
- No manual restarts
- Better DX

**Considerations**:

- ~100 LOC addition
- File watching implementation (fs.watch)
- Memory leaks prevention

---

### 4. CLI Tool

**Status**: Not implemented
**Priority**: Medium
**Effort**: Medium

Command-line utility for .env manipulation:

```bash
# Validate .env file
neo-env validate .env --schema schema.json

# Check for missing variables
neo-env check .env --required PORT,DATABASE_URL

# Generate type definitions
neo-env types .env --output env.d.ts

# Encrypt/decrypt
neo-env encrypt .env --output .env.vault
neo-env decrypt .env.vault --key $DOTENV_KEY
```

**Benefits**:

- CI/CD integration
- Pre-commit hooks
- Type generation

**Considerations**:

- ~300 LOC addition
- New package dependency (CLI framework)
- Separate entry point

---

## Medium Priority Features

### 5. Remote Configuration Loading

**Status**: Not implemented
**Priority**: Medium
**Effort**: High

Load configuration from remote sources:

```typescript
await load({
  remote: {
    url: "https://config.example.com/env",
    headers: { Authorization: "Bearer token" },
    cache: true,
    cacheTTL: 3600,
  },
});

// Or from cloud providers
await load({
  remote: {
    provider: "s3",
    bucket: "my-configs",
    key: ".env.production",
  },
});
```

**Benefits**:

- Centralized configuration
- Cloud-native deployments
- Secret rotation

**Considerations**:

- ~200 LOC addition
- HTTP client (fetch or zero-dep)
- Error handling for network issues
- Security implications

---

### 6. JSON/YAML/TOML Support

**Status**: Not implemented
**Priority**: Low
**Effort**: Medium

Support alternative configuration formats:

```typescript
await load({
  path: "config.json",
  format: "json",
});

await load({
  path: "config.yaml",
  format: "yaml",
});
```

**Benefits**:

- Complex nested configuration
- Better structure
- Developer preference

**Considerations**:

- ~150 LOC addition per format
- May add dependencies (YAML parser)
- Scope creep concern

---

### 7. Docker Secrets Integration

**Status**: Not implemented
**Priority**: Medium
**Effort**: Low

Read secrets from Docker/Kubernetes:

```typescript
await load({
  docker: {
    secretsPath: "/run/secrets",
    prefix: "APP_",
  },
});

// Reads /run/secrets/APP_DATABASE_URL etc.
```

**Benefits**:

- Container-native
- Secure secret management
- Production-ready

**Considerations**:

- ~80 LOC addition
- Docker-specific behavior
- Platform detection

---

### 8. Namespace/Prefix Support

**Status**: Not implemented
**Priority**: Low
**Effort**: Low

Filter variables by prefix:

```typescript
const db = await load({
  path: ".env",
  prefix: "DB_",
  stripPrefix: true,
});

// DB_HOST becomes HOST in db.parsed
```

**Benefits**:

- Organized configuration
- Avoid naming conflicts
- Cleaner code

**Considerations**:

- ~30 LOC addition
- Need clear semantics
- TypeScript implications

---

## Low Priority Features

### 9. Template Literals

**Status**: Not implemented
**Priority**: Low
**Effort**: Medium

Support template literal syntax:

```bash
# .env
API_URL=`https://${HOST}:${PORT}/api/v${VERSION}`
MESSAGE=`Welcome to ${APP_NAME}!`
```

**Benefits**:

- More expressive
- JavaScript-like syntax
- Complex string building

**Considerations**:

- ~100 LOC addition
- May be confusing (different from shell)
- Security implications (code injection)

---

### 10. Conditional Values

**Status**: Not implemented
**Priority**: Low
**Effort**: Medium

Conditional variable assignment:

```bash
# .env
NODE_ENV=development
LOG_LEVEL=${NODE_ENV=="production" ? "error" : "debug"}
```

**Benefits**:

- Environment-specific logic
- Reduced file duplication
- Dynamic configuration

**Considerations**:

- ~150 LOC addition
- Expression parser needed
- Complexity increase

---

### 11. Validation Rules DSL

**Status**: Not implemented
**Priority**: Low
**Effort**: Medium

Embedded validation rules in .env files:

```bash
# .env
PORT=3000 @type:number @min:1024 @max:65535
EMAIL=admin@example.com @type:email @required
NODE_ENV=production @enum:development,production,test
```

**Benefits**:

- Self-documenting
- No separate schema file
- Validation at source

**Considerations**:

- ~200 LOC addition
- New syntax to parse
- May conflict with comments

---

### 12. Export to Other Formats

**Status**: Not implemented
**Priority**: Low
**Effort**: Low

Convert .env to other formats:

```typescript
import { load, export } from '@lpm.dev/neo.env'

const { parsed } = await load()

// Export to JSON
await exportTo(parsed, { format: 'json', path: 'config.json' })

// Export to shell script
await exportTo(parsed, { format: 'shell', path: 'env.sh' })

// Export to TypeScript
await exportTo(parsed, { format: 'typescript', path: 'env.ts' })
```

**Benefits**:

- Migration to other tools
- CI/CD integration
- Type generation

**Considerations**:

- ~100 LOC addition
- Multiple format support
- May overlap with CLI tool

---

## Integration Opportunities

### With Other Neo Packages

- **@lpm.dev/neo.debug** - Debug environment loading
- **@lpm.dev/neo.colors** - Colored CLI output
- **@lpm.dev/neo.logger** - Log configuration changes

### With Popular Tools

- **Next.js** - Automatic .env loading
- **Vite** - Vite-compatible env loading
- **Docker** - Container secrets integration
- **Kubernetes** - ConfigMap/Secret support

---

## Breaking Changes for v2.0

Consider for major version bump:

1. **Require Node 20+** - Use native features
2. **Remove sync API** - Async-only for simplicity
3. **Strict validation by default** - Fail on errors
4. **ESM-only** - Drop CommonJS support
5. **Scoped configuration** - Namespace all env vars

---

## Community Requests

Track feature requests at:

- GitHub Issues
- npm feedback
- User surveys

---

## Recommended Implementation Order

### v0.2.0 (Next Minor)

1. Multiple environment files
2. Watch mode
3. Docker secrets

### v0.3.0

4. CLI tool
5. Encrypted files
6. Remote loading

### v1.0.0 (Stable)

- All core features stable
- Comprehensive documentation
- Production battle-tested

### v2.0.0 (Major)

- Breaking changes
- Architecture improvements
- Modern-only features

---

**Last Updated**: 2026-02-18
**Package Version**: 0.1.0
