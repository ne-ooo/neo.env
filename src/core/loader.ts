import { readFile, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from './parser.js'
import { expand } from './expander.js'
import type { LoadOptions, LoadResult } from '../types.js'

/**
 * Asynchronously load and parse a .env file
 *
 * @param options - Load options
 * @returns Promise with parsed variables and errors
 */
export async function load(options: LoadOptions = {}): Promise<LoadResult> {
  const {
    path = '.env',
    encoding = 'utf8',
    override = false,
    expand: shouldExpand = false,
    debug,
    multiline,
  } = options

  const filePath = resolve(process.cwd(), path)

  // Read file asynchronously
  const content = await new Promise<string>((resolve, reject) => {
    readFile(filePath, encoding, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })

  // Parse content
  const parseOpts: { debug?: boolean; multiline?: boolean } = {}
  if (debug !== undefined) parseOpts.debug = debug
  if (multiline !== undefined) parseOpts.multiline = multiline
  const result = parse(content, parseOpts)

  // Expand variables if requested
  let finalParsed = result.parsed
  if (shouldExpand) {
    finalParsed = expand(result.parsed, {
      processEnv: process.env as Record<string, string>,
      parsed: result.parsed,
    })
  }

  // Apply to process.env
  for (const [key, value] of Object.entries(finalParsed)) {
    if (override || !(key in process.env)) {
      process.env[key] = value
    }
  }

  return {
    parsed: finalParsed,
    errors: result.errors,
  }
}

/**
 * Synchronously load and parse a .env file
 *
 * @param options - Load options
 * @returns Parsed variables and errors
 */
export function loadSync(options: LoadOptions = {}): LoadResult {
  const {
    path = '.env',
    encoding = 'utf8',
    override = false,
    expand: shouldExpand = false,
    debug,
    multiline,
  } = options

  const filePath = resolve(process.cwd(), path)

  // Read file synchronously
  const content = readFileSync(filePath, encoding)

  // Parse content
  const parseOpts: { debug?: boolean; multiline?: boolean } = {}
  if (debug !== undefined) parseOpts.debug = debug
  if (multiline !== undefined) parseOpts.multiline = multiline
  const result = parse(content, parseOpts)

  // Expand variables if requested
  let finalParsed = result.parsed
  if (shouldExpand) {
    finalParsed = expand(result.parsed, {
      processEnv: process.env as Record<string, string>,
      parsed: result.parsed,
    })
  }

  // Apply to process.env
  for (const [key, value] of Object.entries(finalParsed)) {
    if (override || !(key in process.env)) {
      process.env[key] = value
    }
  }

  return {
    parsed: finalParsed,
    errors: result.errors,
  }
}
