import type { ParseError, ParseOptions, ParseResult } from '../types.js'
import { setOwn } from './record.js'

const ENV_ENTRY_SOURCE = String.raw`^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*|:\s+)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*\x60(?:\\\x60|[^\x60])*\x60|[^#\r\n]+)?\s*(?:#.*)?$`

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
 * @param options - Detailed parse options
 * @returns Parsed environment variables and format errors
 */
export function parseDetailed(
  content: string | Buffer,
  options: ParseOptions = {}
): ParseResult {
  void options
  return parseContent(content, true)
}

function parseContent(content: string | Buffer, collectErrors: boolean): ParseResult {
  const parsed: Record<string, string> = {}
  const errors: ParseError[] = []
  const source = content.toString().replace(/\r\n?/g, '\n')
  const lineStarts = collectErrors ? getLineStarts(source) : []
  const coveredLines = collectErrors ? new Set<number>() : undefined
  const entryPattern = new RegExp(ENV_ENTRY_SOURCE, 'gm')

  let match: RegExpExecArray | null
  while ((match = entryPattern.exec(source)) !== null) {
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

    setOwn(parsed, key, value)

    if (coveredLines) {
      const firstLine = lineNumberForOffset(lineStarts, match.index)
      const lastOffset = Math.max(match.index, match.index + match[0].length - 1)
      const lastLine = lineNumberForOffset(lineStarts, lastOffset)
      for (let line = firstLine; line <= lastLine; line++) {
        coveredLines.add(line)
      }
    }
  }

  if (collectErrors && coveredLines) {
    for (const [index, line] of source.split('\n').entries()) {
      const lineNumber = index + 1
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && !coveredLines.has(lineNumber)) {
        errors.push({
          code: 'INVALID_ENTRY',
          line: lineNumber,
          message: 'Invalid environment entry',
        })
      }
    }
  }

  return { parsed, errors }
}

function getLineStarts(source: string): number[] {
  const starts = [0]
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\n') starts.push(index + 1)
  }
  return starts
}

function lineNumberForOffset(lineStarts: number[], offset: number): number {
  let low = 0
  let high = lineStarts.length

  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (lineStarts[middle]! <= offset) low = middle + 1
    else high = middle
  }

  return Math.max(1, low)
}
