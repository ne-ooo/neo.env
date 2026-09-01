import type {
  InferSchema,
  Schema,
  ValidationResult,
  ValidationError,
} from '../types.js'
import { setOwn } from './record.js'

const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

/**
 * Validate and coerce environment variables against a schema
 *
 * @param parsed - Parsed environment variables
 * @param schema - Validation schema
 * @returns Validation result with coerced values and errors
 */
export function validate<const TSchema extends Schema>(
  parsed: Record<string, string | undefined>,
  schema: TSchema
): ValidationResult<InferSchema<TSchema>> {
  const errors: ValidationError[] = []
  const values: Record<string, unknown> = {}

  // Check each schema field
  for (const [key, field] of Object.entries(schema)) {
    if (key === '__proto__') {
      errors.push({
        key,
        message: 'Environment keys cannot use "__proto__"',
      })
      continue
    }

    let rawValue = Object.hasOwn(parsed, key) ? parsed[key] : undefined

    // Apply defaults before validation and type coercion.
    if (rawValue === undefined && field.default !== undefined) {
      rawValue = field.default
    }

    if (rawValue === undefined) {
      if (field.required) {
        errors.push({
          key,
          message: `Required field "${key}" is missing`,
        })
      }
      continue
    }

    // Check enum
    if (field.enum && !field.enum.includes(rawValue)) {
      errors.push({
        key,
        message: `"${key}" must be one of: ${field.enum.join(', ')}`,
      })
      continue
    }

    // Check pattern
    if (field.pattern) {
      const pattern = new RegExp(field.pattern.source, field.pattern.flags)
      const matches = pattern.test(rawValue)
      if (!matches) {
        errors.push({
          key,
          message: `"${key}" does not match required pattern`,
        })
        continue
      }
    }

    // Type coercion
    let finalValue: unknown = rawValue

    if (field.transform) {
      try {
        finalValue = field.transform(rawValue)
      } catch {
        errors.push({
          key,
          message: `Transform failed for "${key}"`,
        })
        continue
      }
    } else if (field.type) {
      switch (field.type) {
        case 'number': {
          if (!DECIMAL_NUMBER.test(rawValue)) {
            errors.push({
              key,
              message: `"${key}" must be a valid number`,
            })
            continue
          }
          finalValue = Number(rawValue)
          if (!Number.isFinite(finalValue)) {
            errors.push({
              key,
              message: `"${key}" must be a finite number`,
            })
            continue
          }
          break
        }

        case 'boolean': {
          const lower = rawValue.toLowerCase()
          if (lower === 'true' || lower === '1') {
            finalValue = true
          } else if (lower === 'false' || lower === '0') {
            finalValue = false
          } else {
            errors.push({
              key,
              message: `"${key}" must be a boolean (true/false, 1/0)`,
            })
            continue
          }
          break
        }

        case 'url': {
          try {
            new URL(rawValue)
            finalValue = rawValue
          } catch {
            errors.push({
              key,
              message: `"${key}" must be a valid URL`,
            })
            continue
          }
          break
        }

        case 'email': {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
            errors.push({
              key,
              message: `"${key}" must be a valid email`,
            })
            continue
          }
          finalValue = rawValue
          break
        }

        case 'json': {
          try {
            finalValue = JSON.parse(rawValue)
          } catch {
            errors.push({
              key,
              message: `"${key}" must be valid JSON`,
            })
            continue
          }
          break
        }

        case 'string':
        default: {
          finalValue = rawValue
          break
        }
      }
    }

    setOwn(values, key, finalValue)
  }

  if (errors.length === 0) {
    return {
      valid: true,
      errors: [],
      values: values as InferSchema<TSchema>,
    }
  }

  return {
    valid: false,
    errors,
    values: values as Partial<InferSchema<TSchema>>,
  }
}
