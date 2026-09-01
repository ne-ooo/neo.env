import type { ExpandOptions, ExpansionErrorCode } from '../types.js'
import { setOwn } from './record.js'

const DEFAULT_MAX_DEPTH = 64
const MAX_ALLOWED_DEPTH = 256
const DEFAULT_MAX_OUTPUT_LENGTH = 1024 * 1024
const DEFAULT_MAX_TOTAL_OUTPUT_LENGTH = 16 * 1024 * 1024
const DEFAULT_MAX_EXPANSION_WORK_LENGTH = 16 * 1024 * 1024

interface ExpansionToken {
  end: number
  name: string
  defaultValue?: string
}

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
  if (Object.hasOwn(parsed, '__proto__')) {
    throw new TypeError('Environment keys cannot use "__proto__"')
  }

  const processEnv = options.processEnv ?? process.env
  const lookupParsed = options.parsed ?? parsed
  const recursive = options.recursive ?? true
  const maxDepth = positiveInteger(
    options.maxDepth,
    DEFAULT_MAX_DEPTH,
    'maxDepth',
    MAX_ALLOWED_DEPTH
  )
  const maxOutputLength = positiveInteger(
    options.maxOutputLength,
    DEFAULT_MAX_OUTPUT_LENGTH,
    'maxOutputLength'
  )
  const maxTotalOutputLength = positiveInteger(
    options.maxTotalOutputLength,
    DEFAULT_MAX_TOTAL_OUTPUT_LENGTH,
    'maxTotalOutputLength'
  )
  const maxExpansionWorkLength = positiveInteger(
    options.maxExpansionWorkLength,
    DEFAULT_MAX_EXPANSION_WORK_LENGTH,
    'maxExpansionWorkLength'
  )
  const expanded: Record<string, string> = {}
  const memo = new Map<string, string>()
  const activeIds = new Set<string>()
  const activeStack: Array<{ id: string; label: string }> = []
  let totalOutputLength = 0
  let expansionWorkLength = 0
  let memoizedLength = 0

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
    if (value.length > 0) chunks.push(value)
    return nextLength
  }

  const storeResult = (key: string, value: string): void => {
    if (value.length > maxOutputLength) {
      throw new ExpansionError(
        'MAX_OUTPUT_LENGTH',
        `Variable expansion exceeded ${maxOutputLength} characters for "${key}"`,
        key
      )
    }

    const nextTotal = totalOutputLength + value.length
    if (nextTotal > maxTotalOutputLength) {
      throw new ExpansionError(
        'MAX_TOTAL_OUTPUT_LENGTH',
        `Variable expansion exceeded ${maxTotalOutputLength} total characters for "${key}"`,
        key
      )
    }

    totalOutputLength = nextTotal
    setOwn(expanded, key, value)
  }

  const recordExpansionWork = (length: number, variable?: string): void => {
    const nextLength = expansionWorkLength + length
    if (nextLength > maxExpansionWorkLength) {
      throw new ExpansionError(
        'MAX_EXPANSION_WORK_LENGTH',
        `Variable expansion exceeded ${maxExpansionWorkLength} intermediate characters${
          variable ? ` for "${variable}"` : ''
        }`,
        variable
      )
    }
    expansionWorkLength = nextLength
  }

  const readMemo = (id: string): string | undefined => {
    const value = memo.get(id)
    if (value !== undefined) {
      memo.delete(id)
      memo.set(id, value)
    }
    return value
  }

  const memoize = (id: string, value: string): void => {
    if (value.length > maxTotalOutputLength) return

    while (
      memo.size > 0 &&
      memoizedLength + value.length > maxTotalOutputLength
    ) {
      const oldest = memo.entries().next().value as
        | [string, string]
        | undefined
      if (!oldest) break
      memo.delete(oldest[0])
      memoizedLength -= oldest[1].length
    }

    memo.set(id, value)
    memoizedLength += value.length
  }

  const unescapeReference = (value: string, variable?: string): string => {
    recordExpansionWork(value.length, variable)
    return unescapeDollars(value)
  }

  const resolveNode = (
    id: string,
    label: string,
    rawValue: string,
    depth: number
  ): string => {
    const cached = readMemo(id)
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
      const value = expandTemplate(rawValue, depth, label)
      memoize(id, value)
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
      value = recursive
        ? resolveNode(`parsed:${name}`, name, rawValue, depth + 1)
        : unescapeReference(rawValue, name)
    } else if (Object.hasOwn(processEnv, name)) {
      const rawValue = processEnv[name]
      if (rawValue !== undefined) {
        value = recursive
          ? resolveNode(`process:${name}`, name, rawValue, depth + 1)
          : unescapeReference(rawValue, name)
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
        : unescapeReference(defaultValue, `${name} default`)
    }

    return value === undefined ? original : value
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

    if (!value.includes('$')) {
      if (value.length > maxOutputLength) {
        throw new ExpansionError(
          'MAX_OUTPUT_LENGTH',
          `Variable expansion exceeded ${maxOutputLength} characters${
            owner ? ` for "${owner}"` : ''
          }`,
          owner
        )
      }
      return value
    }

    recordExpansionWork(value.length, owner)

    const chunks: string[] = []
    let length = 0
    let cursor = 0
    let index = 0

    while (index < value.length) {
      if (value[index] === '\\' && value[index + 1] === '$') {
        length = appendWithLimit(chunks, length, value.slice(cursor, index), owner)
        length = appendWithLimit(chunks, length, '$', owner)
        index += 2
        cursor = index
        continue
      }

      if (value[index] !== '$') {
        index++
        continue
      }

      const token = readExpansionToken(value, index)
      if (!token) {
        index++
        continue
      }

      length = appendWithLimit(chunks, length, value.slice(cursor, index), owner)
      const original = value.slice(index, token.end)
      const replacement = resolveReference(
        token.name,
        token.defaultValue,
        original,
        depth,
        owner
      )
      length = appendWithLimit(chunks, length, replacement, owner)
      index = token.end
      cursor = index
    }

    length = appendWithLimit(chunks, length, value.slice(cursor), owner)
    recordExpansionWork(length, owner)
    return chunks.join('')
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (!value.includes('$')) {
      storeResult(key, value)
      continue
    }

    const result =
      recursive && Object.hasOwn(lookupParsed, key) && lookupParsed[key] === value
        ? resolveNode(`parsed:${key}`, key, value, 0)
        : resolveNode(`output:${key}`, key, value, 0)
    storeResult(key, result)
  }

  return expanded
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
  maximum?: number
): number {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`)
  }
  if (maximum !== undefined && value > maximum) {
    throw new TypeError(`${name} must be at most ${maximum}`)
  }
  return value
}

function unescapeDollars(value: string): string {
  return value.replace(/\\\$/g, '$')
}

function readExpansionToken(
  value: string,
  start: number
): ExpansionToken | undefined {
  const next = value[start + 1]
  if (next === '{') return readBracedToken(value, start)
  if (!next || !/[A-Z_]/.test(next)) return undefined

  let end = start + 2
  while (end < value.length && /[A-Z0-9_]/.test(value[end]!)) end++
  return { end, name: value.slice(start + 1, end) }
}

function readBracedToken(
  value: string,
  start: number
): ExpansionToken | undefined {
  const nameStart = start + 2
  let index = nameStart

  while (index < value.length) {
    const character = value[index]!
    if (character === '$') return undefined

    if (character === '}') {
      if (index === nameStart) return undefined
      return {
        end: index + 1,
        name: value.slice(nameStart, index).trim(),
      }
    }

    if (character === ':') {
      if (index === nameStart || value[index + 1] !== '-') return undefined
      const defaultStart = index + 2
      index = defaultStart

      while (index < value.length) {
        const defaultCharacter = value[index]!
        if (defaultCharacter === '\\') {
          if (index + 1 >= value.length) return undefined
          index += 2
          continue
        }
        if (defaultCharacter === '$' && value[index + 1] === '{') {
          return undefined
        }
        if (defaultCharacter === '}') {
          return {
            end: index + 1,
            name: value.slice(nameStart, defaultStart - 2).trim(),
            defaultValue: value.slice(defaultStart, index),
          }
        }
        index++
      }

      return undefined
    }

    index++
  }

  return undefined
}
