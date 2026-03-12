import type { ExpandOptions } from '../types.js'

/**
 * Expand variable references in parsed environment variables
 *
 * Supports:
 * - $VAR syntax
 * - ${VAR} syntax
 * - ${VAR:-default} with default values
 *
 * @param parsed - Parsed environment variables
 * @param options - Expansion options
 * @returns Expanded environment variables
 */
export function expand(
  parsed: Record<string, string>,
  options: ExpandOptions = {}
): Record<string, string> {
  const processEnv = options.processEnv ?? process.env
  const recursive = options.recursive ?? true
  const maxDepth = 10 // Prevent infinite loops

  const expanded: Record<string, string> = {}

  for (const [key, value] of Object.entries(parsed)) {
    expanded[key] = expandValue(value, parsed, processEnv, recursive ? maxDepth : 1)
  }

  return expanded
}

/**
 * Expand variable references in a single value
 */
function expandValue(
  value: string,
  parsed: Record<string, string>,
  processEnv: Record<string, string | undefined>,
  depth: number
): string {
  if (depth <= 0) {
    return value // Prevent infinite recursion
  }

  let expanded = value

  // Handle ${VAR} and ${VAR:-default}
  expanded = expanded.replace(
    /\$\{([^}:]+)(?::-((?:[^}\\]|\\.)*))?\}/g,
    (match, varName, defaultValue) => {
      const trimmedName = varName.trim()

      // Check parsed first, then process.env
      if (trimmedName in parsed) {
        return parsed[trimmedName]!
      }
      if (trimmedName in processEnv) {
        const envValue = processEnv[trimmedName]
        if (envValue !== undefined) {
          return envValue
        }
      }

      // Use default value if provided
      if (defaultValue !== undefined) {
        return defaultValue
      }

      // Keep original if not found and no default
      return match
    }
  )

  // Handle $VAR (simpler syntax, no defaults)
  expanded = expanded.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    // Check parsed first, then process.env
    if (varName in parsed) {
      return parsed[varName]!
    }
    if (varName in processEnv) {
      const envValue = processEnv[varName]
      if (envValue !== undefined) {
        return envValue
      }
    }

    // Keep original if not found
    return match
  })

  // Recursively expand if value changed and depth allows
  if (expanded !== value && depth > 1) {
    return expandValue(expanded, parsed, processEnv, depth - 1)
  }

  return expanded
}
