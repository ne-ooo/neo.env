# Changelog

This file records notable changes to the package.
The format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Added a 16 MiB default limit for the combined expansion output.
- Added a 16 MiB default limit for cumulative intermediate expansion work.
- Added a bounded terminal diagnostic when detailed parsing exceeds 100 errors.
- Added scaling benchmarks for static expansion, unrelated environment values, and detailed parsing.

### Changed

- Limited custom expansion depth to 256 to prevent call-stack failures.
- Rejected `__proto__` keys at input boundaries.
- Rejected NUL characters during detailed parsing and file loading.
- Removed transform exception details from public validation errors.
- Made validation results discriminate complete success values from partial failure values.
- Treated own empty strings as present during schema validation.
- Removed unsupported `debug` and `multiline` parse options.
- Pinned the patched `nanoid` 3.3.18 transitive development dependency.
- Updated the CI and contributor LPM requirement for the v13 lockfile.

### Fixed

- Removed the escaped-dollar marker scan and its Unicode collision failure.
- Avoided scans of unrelated environment values during expansion.
- Added a fast path for static expansion values.
- Replaced detailed-parser line searches with a monotonic cursor.
- Replaced expansion token matching with a linear scanner.
- Replaced detailed-parser line arrays and sets with an incremental gap scan.
- Prevented horizontal parser whitespace from consuming later entries.
- Corrected detailed error lines after blank input lines.
- Counted token scanning toward expansion work and omitted empty output chunks.
- Counted non-recursive reference unescaping toward expansion work.

## [1.0.0] - 2026-08-07

### Added

- Added async and synchronous `.env` file loaders.
- Added dotenv-compatible `config()` and `parse()` functions.
- Added `parseDetailed()` with line numbers and stable error codes.
- Added recursive variable expansion with defaults and escaped-dollar support.
- Added cycle detection, depth limits, output limits, and memoized references.
- Added schema validation, type coercion, defaults, patterns, enums, and transforms.
- Added schema-driven TypeScript inference for validated values.
- Added ESM, CommonJS, declarations, and a side-effect configuration entry.
- Added LPM dependency locking, security audits, and package validation.
- Added CI for Node.js 18, 20, 22, and 24.

### Changed

- Applied schema defaults before validation and coercion.
- Applied override rules before variable expansion.
- Made native loads atomic when format errors exist.
- Limited number validation to finite decimal and exponent syntax.
- Separated expansion-only and parse-and-expand benchmarks.
- Reported benchmark medians and ranges from five independent runs.

### Fixed

- Prevented parser errors from exposing environment values.
- Prevented prototype-like keys from changing object prototypes.
- Made stateful regular-expression validation deterministic.
- Added named and default exports for ESM and CommonJS consumers.
- Added staged-package tests for both package formats.
- Removed the CommonJS mixed-export build warning without changing the exports.
