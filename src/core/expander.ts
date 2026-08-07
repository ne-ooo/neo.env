import type { ExpandOptions, ExpansionErrorCode } from '../types.js'
import { setOwn } from './record.js'

const DEFAULT_MAX_DEPTH = 64
const DEFAULT_MAX_OUTPUT_LENGTH = 1024 * 1024
const VARIABLE_SOURCE = String.raw`\$\{([^}:]+)(?::-((?:[^}\\]|\\.)*))?\}|\$([A-Z_][A-Z0-9_]*)`

export class ExpansionError extends Error {
  readonly code: ExpansionErrorCode
  readonly variable?: string

  constructor(code: ExpansionErrorCode, message: string, variable?: string) {
    super(message)
    this.name = 'ExpansionError'
    this.code = code
    if (variable !== undefined) this.variable = variable
  }
}

/**
 * Expand variable references in parsed environment variables.
 *
 * Supports:
 * - $VAR syntax
 * - ${VAR} syntax
 * - ${VAR:-default} with default values
 * - \$VAR for a literal dollar reference
 *
 * @param parsed - Values to expand
 * @param options - Expansion options
 * @returns Expanded environment variables
 */
export function expand(
  parsed: Record<string, string>,
  options: ExpandOptions = {}
): Record<string, string> {
  const processEnv = options.processEnv ?? process.env
  const lookupParsed = options.parsed ?? parsed
  const recursive = options.recursive ?? true
  const maxDepth = positiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH, 'maxDepth')
  const maxOutputLength = positiveInteger(
    options.maxOutputLength,
    DEFAULT_MAX_OUTPUT_LENGTH,
    'maxOutputLength'
  )
  const escapedDollar = selectEscapedDollar(parsed, lookupParsed, processEnv)
  const expanded: Record<string, string> = {}
  const memo = new Map<string, string>()
  const activeIds = new Set<string>()
  const activeStack: Array<{ id: string; label: string }> = []

  const protectEscapedDollars = (value: string): string =>
    value.replace(/\\\$/g, escapedDollar)

  const appendWithLimit = (
    chunks: string[],
    currentLength: number,
    value: string,
    variable?: string
  ): number => {
    const nextLength = currentLength + value.length
    if (nextLength > maxOutputLength) {
      throw new ExpansionError(
        'MAX_OUTPUT_LENGTH',
        `Variable expansion exceeded ${maxOutputLength} characters${
          variable ? ` for "${variable}"` : ''
        }`,
        variable
      )
    }
    chunks.push(value)
    return nextLength
  }

  const resolveNode = (
    id: string,
    label: string,
    rawValue: string,
    depth: number
  ): string => {
    const cached = memo.get(id)
    if (cached !== undefined) return cached

    if (activeIds.has(id)) {
      const cycleStart = activeStack.findIndex((entry) => entry.id === id)
      const cycle = [...activeStack.slice(cycleStart).map((entry) => entry.label), label]
      throw new ExpansionError(
        'CYCLE',
        `Variable expansion found a cycle: ${cycle.join(' -> ')}`,
        label
      )
    }

    if (depth > maxDepth) {
      throw new ExpansionError(
        'MAX_DEPTH',
        `Variable expansion exceeded a depth of ${maxDepth} for "${label}"`,
        label
      )
    }

    activeIds.add(id)
    activeStack.push({ id, label })
    try {
      const value = expandTemplate(protectEscapedDollars(rawValue), depth, label)
      memo.set(id, value)
      return value
    } finally {
      activeStack.pop()
      activeIds.delete(id)
    }
  }

  const resolveReference = (
    name: string,
    defaultValue: string | undefined,
    original: string,
    depth: number,
    owner?: string
  ): string => {
    let value: string | undefined

    if (Object.hasOwn(lookupParsed, name)) {
      const rawValue = lookupParsed[name]!
      value = recursive ? resolveNode(`parsed:${name}`, name, rawValue, depth + 1) : rawValue
    } else if (Object.hasOwn(processEnv, name)) {
      const rawValue = processEnv[name]
      if (rawValue !== undefined) {
        value = recursive
          ? resolveNode(`process:${name}`, name, rawValue, depth + 1)
          : rawValue
      }
    }

    if ((value === undefined || value === '') && defaultValue !== undefined) {
      return recursive
        ? resolveNode(
            `default:${owner ?? ''}:${name}:${depth}:${defaultValue}`,
            `${name} default`,
            defaultValue,
            depth + 1
          )
        : defaultValue
    }

    return value === undefined ? original : protectEscapedDollars(value)
  }

  function expandTemplate(value: string, depth: number, owner?: string): string {
    if (depth > maxDepth) {
      throw new ExpansionError(
        'MAX_DEPTH',
        `Variable expansion exceeded a depth of ${maxDepth}${
          owner ? ` for "${owner}"` : ''
        }`,
        owner
      )
    }

    const pattern = new RegExp(VARIABLE_SOURCE, 'g')
    const chunks: string[] = []
    let length = 0
    let cursor = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(value)) !== null) {
      length = appendWithLimit(chunks, length, value.slice(cursor, match.index), owner)
      const name = (match[1] ?? match[3] ?? '').trim()
      const replacement = resolveReference(name, match[2], match[0], depth, owner)
      length = appendWithLimit(chunks, length, replacement, owner)
      cursor = match.index + match[0].length
    }

    appendWithLimit(chunks, length, value.slice(cursor), owner)
    return chunks.join('')
  }

  for (const [key, value] of Object.entries(parsed)) {
    const protectedValue = protectEscapedDollars(value)
    const result =
      recursive && Object.hasOwn(lookupParsed, key) && lookupParsed[key] === value
        ? resolveNode(`parsed:${key}`, key, value, 0)
        : resolveNode(`output:${key}`, key, protectedValue, 0)
    setOwn(expanded, key, result.replaceAll(escapedDollar, '$'))
  }

  return expanded
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`)
  }
  return value
}

function selectEscapedDollar(
  parsed: Record<string, string>,
  lookupParsed: Record<string, string>,
  processEnv: Record<string, string | undefined>
): string {
  const values = [
    ...Object.values(parsed),
    ...Object.values(lookupParsed),
    ...Object.values(processEnv).filter((value): value is string => value !== undefined),
  ]

  for (let codePoint = 0xe000; codePoint <= 0xf8ff; codePoint++) {
    const candidate = String.fromCodePoint(codePoint)
    if (values.every((value) => !value.includes(candidate))) return candidate
  }

  throw new ExpansionError(
    'MAX_OUTPUT_LENGTH',
    'Variable expansion could not reserve an escaped-dollar marker'
  )
}
