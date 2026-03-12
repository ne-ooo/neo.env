import type { ParseOptions, ParseResult } from '../types.js'

/**
 * Parse .env file content into key-value pairs
 *
 * @param content - The .env file content to parse
 * @param options - Parse options
 * @returns Parsed environment variables and any errors
 */
export function parse(content: string, options: ParseOptions = {}): ParseResult {
  const parsed: Record<string, string> = {}
  const errors: Array<{ line: number; message: string }> = []

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lineNumber = i + 1

    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue
    }

    // Match: KEY=value or export KEY=value
    const match = line.match(/^\s*(?:export\s+)?(?<key>[\w.-]+)\s*=\s*(?<value>.*)$/)

    if (!match?.groups) {
      errors.push({
        line: lineNumber,
        message: `Invalid line format: ${line.trim()}`,
      })
      continue
    }

    const { key, value } = match.groups

    if (!key) {
      errors.push({
        line: lineNumber,
        message: 'Missing key',
      })
      continue
    }

    // Process the value
    let finalValue = (value || '').trim()

    // Handle quoted values
    if (
      (finalValue.startsWith('"') && finalValue.endsWith('"')) ||
      (finalValue.startsWith("'") && finalValue.endsWith("'")) ||
      (finalValue.startsWith('`') && finalValue.endsWith('`'))
    ) {
      // Remove surrounding quotes
      finalValue = finalValue.slice(1, -1)

      // Unescape common sequences
      finalValue = finalValue
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\`/g, '`')
    } else {
      // For unquoted values, remove inline comments
      finalValue = finalValue.replace(/\s+#.*$/, '').trim()
    }

    parsed[key] = finalValue
  }

  return { parsed, errors }
}
