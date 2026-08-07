# Changelog

This file records notable changes to the package.
The format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
