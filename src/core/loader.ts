import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseDetailed } from './parser.js'
import { expand } from './expander.js'
import { setOwn } from './record.js'
import type {
  ConfigResult,
  ExpandOptions,
  LoadOptions,
  LoadResult,
  ParseOptions,
} from '../types.js'

/**
 * Asynchronously load and parse a .env file.
 *
 * @param options - Load options
 * @returns Parsed variables and format errors
 */
export async function load(options: LoadOptions = {}): Promise<LoadResult> {
  const path = options.path ?? '.env'
  const encoding = options.encoding ?? 'utf8'
  const filePath = resolve(process.cwd(), path)

  const { readFile } = await import('node:fs/promises')
  const content = await readFile(filePath, encoding)

  return processContent(content, options)
}

/**
 * Synchronously load and parse a .env file.
 *
 * @param options - Load options
 * @returns Parsed variables and format errors
 */
export function loadSync(options: LoadOptions = {}): LoadResult {
  const path = options.path ?? '.env'
  const encoding = options.encoding ?? 'utf8'
  const filePath = resolve(process.cwd(), path)
  const content = readFileSync(filePath, encoding)

  return processContent(content, options)
}

/**
 * Load a .env file with the dotenv-compatible error contract.
 *
 * @param options - Load options
 * @returns Parsed variables and an optional file error
 */
export function config(options: LoadOptions = {}): ConfigResult {
  try {
    const configOptions =
      options.allowPartial === undefined ? { ...options, allowPartial: true } : options
    return { parsed: loadSync(configOptions).parsed }
  } catch (error) {
    return { parsed: {}, error: toError(error) }
  }
}

/**
 * Load a .env file asynchronously.
 *
 * @param options - Load options
 * @returns Parsed variables and format errors
 */
export function configAsync(options: LoadOptions = {}): Promise<LoadResult> {
  return load(options)
}

function processContent(content: string, options: LoadOptions): LoadResult {
  const parseOptions = selectParseOptions(options)
  const result = parseDetailed(content, parseOptions)

  if (result.errors.length > 0 && !(options.allowPartial ?? false)) {
    return result
  }

  const targetEnv = options.processEnv ?? process.env
  const override = options.override ?? false
  let finalParsed = result.parsed

  if (options.expand) {
    const effectiveParsed: Record<string, string> = {}
    for (const [key, value] of Object.entries(result.parsed)) {
      if (override || !Object.hasOwn(targetEnv, key)) {
        setOwn(effectiveParsed, key, value)
      }
    }

    const expandOptions: ExpandOptions = {
      processEnv: targetEnv,
      parsed: effectiveParsed,
      recursive: options.recursive ?? true,
    }
    if (options.maxDepth !== undefined) expandOptions.maxDepth = options.maxDepth
    if (options.maxOutputLength !== undefined) {
      expandOptions.maxOutputLength = options.maxOutputLength
    }
    finalParsed = expand(result.parsed, expandOptions)
  }

  for (const [key, value] of Object.entries(finalParsed)) {
    if (override || !Object.hasOwn(targetEnv, key)) setOwn(targetEnv, key, value)
  }

  return { parsed: finalParsed, errors: result.errors }
}

function selectParseOptions(options: LoadOptions): ParseOptions {
  const selected: ParseOptions = {}
  if (options.debug !== undefined) selected.debug = options.debug
  if (options.multiline !== undefined) selected.multiline = options.multiline
  return selected
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}
