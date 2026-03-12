# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-03-09

### Added

- `load(options?)` — Async `.env` file loader with `path`, `encoding`, `override`, `expand` options
- `loadSync(options?)` — Synchronous loader for dotenv API compatibility
- `parse(content, options?)` — Parse `.env` content string into key-value pairs
- `expand(parsed, options?)` — Variable interpolation: `$VAR`, `${VAR}`, `${VAR:-default}` syntax
- `validate(parsed, schema)` — Schema-based validation and type coercion (`string`, `number`, `boolean`, `url`, `email`, `json`)
- Schema features: `required`, `default`, `enum`, `pattern`, `transform`
- Default export with `config()` / `configAsync()` / `parse()` / `expand()` / `validate()` for dotenv drop-in compatibility
- Auto-load via `import '@lpm.dev/neo.env/config'`
- `.env` syntax support: comments, quoted values (single/double/backtick), escape sequences, inline comments, `export` prefix, whitespace trimming
- Full TypeScript types: `LoadOptions`, `LoadResult`, `ParseResult`, `Schema`, `ValidationResult`
- Zero runtime dependencies
- ESM + CJS dual output with TypeScript declaration files
- Source maps for debugging
- 97 tests across parser, expander, validator, and loader
