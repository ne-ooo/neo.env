# Performance Benchmarks

This report compares `@lpm.dev/neo.env` with `dotenv@17.4.2`.
It also measures the expansion operations that `dotenv` does not provide.

## Test Environment

- Package version: `1.0.0`
- Date: 2026-08-07
- Hardware: Apple M5 Pro (`arm64`)
- Operating system: macOS 26.5.2
- Node.js: 22.22.3, selected by LPM
- Test runner: Vitest 3.2.7

## Method

The benchmark ran five times in separate processes.
Each process used the default Vitest warm-up and sampling periods.
The tables show the median operation rate and the full range from the five runs.
A larger operation rate is better.

The expansion-only case parses its input before the timed operation.
The parse-and-expand case includes both operations in the timed operation.
This separation prevents duplicate or misleading expansion measurements.

## Parser Results

| Scenario | `neo.env` median Hz | `neo.env` range | `dotenv` median Hz | `dotenv` range | Median ratio |
|---|---:|---:|---:|---:|---:|
| Three entries | 2,553,452 | 2,541,284–2,567,710 | 2,076,754 | 1,871,967–2,167,208 | 1.23x |
| 100 entries | 98,978 | 97,472–101,365 | 67,738 | 59,881–68,133 | 1.46x |
| Comments | 1,273,538 | 1,255,673–1,285,855 | 911,454 | 829,052–928,594 | 1.40x |
| Quoted values | 1,776,026 | 1,739,681–1,783,649 | 1,097,148 | 1,004,003–1,108,677 | 1.62x |
| Escape sequences | 1,666,511 | 1,629,982–1,693,446 | 1,299,388 | 1,178,898–1,337,570 | 1.28x |
| Example production file | 548,383 | 543,435–567,408 | 371,759 | 337,282–376,431 | 1.48x |

The smallest `dotenv` case had the largest run-to-run variation.
Use the ranges when you compare the results.

## Expansion Results

| Scenario | Median Hz | Range |
|---|---:|---:|
| Expansion only, four entries | 544,641 | 524,570–568,773 |
| Parse and expansion, four entries | 421,623 | 408,183–432,245 |
| Shared-reference expansion, 102 entries | 16,912 | 15,972–17,233 |
| Example production file with expansion | 118,347 | 114,055–119,445 |

The shared-reference case contains 100 values that depend on the same expanded value.
The expander memoizes that shared value.
It also rejects cycles and limits the reference depth and output length.

## Built Package Size

The size table contains the uncompressed output from `lpm run build`.

| Entry | ESM | CommonJS | Declaration file |
|---|---:|---:|---:|
| Main API | 14,459 bytes | 16,387 bytes | 5,458 bytes per format |
| Side-effect configuration | 10,303 bytes | 10,370 bytes | 13 bytes per format |

The package has no runtime dependencies.
The size values do not include source maps.

## Run the Benchmark

Run one trial:

```bash
lpm run bench
```

Run this command five times to reproduce the run-level median and range.
Do not compare results from different hardware or Node.js versions as one data set.

## Interpretation

Environment parsing usually occurs once during application startup.
As a result, parser micro-optimizations have less value than safe expansion behavior.
The expansion implementation uses memoization for repeated references.
It also uses explicit limits for adversarial input.

These results describe this test environment only.
They do not guarantee the same ratio for other files, computers, or Node.js versions.
