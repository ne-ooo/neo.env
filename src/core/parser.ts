import type { ParseError, ParseResult } from '../types.js'
import { setOwn } from './record.js'

const HORIZONTAL_WHITESPACE = String.raw`[^\S\r\n]`
const ENV_ENTRY_SOURCE = String.raw`^${HORIZONTAL_WHITESPACE}*(?:export${HORIZONTAL_WHITESPACE}+)?([\w.-]+)(?:${HORIZONTAL_WHITESPACE}*=${HORIZONTAL_WHITESPACE}*|:${HORIZONTAL_WHITESPACE}+)(${HORIZONTAL_WHITESPACE}*'(?:\\'|[^'])*'|${HORIZONTAL_WHITESPACE}*"(?:\\"|[^"])*"|${HORIZONTAL_WHITESPACE}*\x60(?:\\\x60|[^\x60])*\x60|[^#\r\n]+)?${HORIZONTAL_WHITESPACE}*(?:#.*)?$`
const MAX_PARSE_ERRORS = 100

interface ParseDiagnostics {
  errors: ParseError[]
  truncated: boolean
}

/**
 * Parse .env content with the dotenv-compatible API.
 *
 * @param content - The .env content to parse
 * @returns Parsed environment variables
 */
export function parse(content: string | Buffer): Record<string, string> {
  return parseContent(content, false).parsed
}

/**
 * Parse .env content and return line-numbered format errors.
 *
 * @param content - The .env content to parse
 * @returns Parsed environment variables and format errors
 */
export function parseDetailed(
  content: string | Buffer
): ParseResult {
  return parseContent(content, true)
}

function parseContent(content: string | Buffer, collectErrors: boolean): ParseResult {
  const parsed: Record<string, string> = {}
  const diagnostics: ParseDiagnostics = { errors: [], truncated: false }
  const source = content.toString().replace(/\r\n?/g, '\n')
  const entryPattern = new RegExp(ENV_ENTRY_SOURCE, 'gm')
  let checkedOffset = 0
  let currentLine = 1

  let match: RegExpExecArray | null
  while ((match = entryPattern.exec(source)) !== null) {
    if (collectErrors) {
      currentLine = collectInvalidLines(
        source,
        checkedOffset,
        match.index,
        currentLine,
        diagnostics
      )
    }

    const key = match[1]
    if (!key) continue

    let value = (match[2] ?? '').trim()
    const quote = value[0]

    if (
      (quote === '"' || quote === "'" || quote === '`') &&
      value.at(-1) === quote
    ) {
      value = value.slice(1, -1)
    }

    if (quote === '"') {
      value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
    }

    if (collectErrors) {
      if (value.includes('\0')) {
        addParseError(diagnostics, {
          code: 'INVALID_ENTRY',
          line: currentLine,
          message: 'Environment values cannot contain NUL characters',
        })
      } else if (key === '__proto__') {
        addParseError(diagnostics, {
          code: 'INVALID_ENTRY',
          line: currentLine,
          message: 'Environment keys cannot use "__proto__"',
        })
      } else {
        setOwn(parsed, key, value)
      }
    } else if (key !== '__proto__') {
      setOwn(parsed, key, value)
    }

    currentLine += countNewlines(match[0])
    checkedOffset = entryPattern.lastIndex
  }

  if (collectErrors) {
    collectInvalidLines(
      source,
      checkedOffset,
      source.length,
      currentLine,
      diagnostics
    )
  }

  return { parsed, errors: diagnostics.errors }
}

function collectInvalidLines(
  source: string,
  start: number,
  end: number,
  firstLine: number,
  diagnostics: ParseDiagnostics
): number {
  let line = firstLine
  let lineStart = start

  for (let index = start; index <= end; index++) {
    if (index < end && source[index] !== '\n') continue

    if (isInvalidLine(source, lineStart, index)) {
      addParseError(diagnostics, {
        code: 'INVALID_ENTRY',
        line,
        message: 'Invalid environment entry',
      })
    }

    if (index < end) line++
    lineStart = index + 1
  }

  return line
}

function addParseError(
  diagnostics: ParseDiagnostics,
  error: ParseError
): void {
  if (diagnostics.errors.length < MAX_PARSE_ERRORS) {
    diagnostics.errors.push(error)
    return
  }

  if (!diagnostics.truncated) {
    diagnostics.errors.push({
      code: 'TOO_MANY_ERRORS',
      line: error.line,
      message: `Additional parse errors were omitted after ${MAX_PARSE_ERRORS} errors`,
    })
    diagnostics.truncated = true
  }
}

function isInvalidLine(source: string, start: number, end: number): boolean {
  let index = start
  while (index < end && isHorizontalWhitespace(source[index]!)) index++
  return index < end && source[index] !== '#'
}

function isHorizontalWhitespace(character: string): boolean {
  return character !== '\n' && character.trim() === ''
}

function countNewlines(value: string): number {
  let count = 0
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '\n') count++
  }
  return count
}
