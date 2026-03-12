import type { Schema, ValidationResult, ValidationError } from '../types.js'

/**
 * Validate and coerce environment variables against a schema
 *
 * @param parsed - Parsed environment variables
 * @param schema - Validation schema
 * @returns Validation result with coerced values and errors
 */
export function validate(
  parsed: Record<string, string>,
  schema: Schema
): ValidationResult {
  const errors: ValidationError[] = []
  const values: Record<string, any> = {}

  // Check each schema field
  for (const [key, field] of Object.entries(schema)) {
    const rawValue = parsed[key]

    // Check required
    if (field.required && !rawValue) {
      errors.push({
        key,
        message: `Required field "${key}" is missing`,
      })
      continue
    }

    // Use default if not provided
    if (!rawValue) {
      if (field.default !== undefined) {
        values[key] = field.default
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
    if (field.pattern && !field.pattern.test(rawValue)) {
      errors.push({
        key,
        message: `"${key}" does not match required pattern`,
      })
      continue
    }

    // Type coercion
    let finalValue: any = rawValue

    if (field.transform) {
      try {
        finalValue = field.transform(rawValue)
      } catch (err) {
        errors.push({
          key,
          message: `Transform failed for "${key}": ${err}`,
        })
        continue
      }
    } else if (field.type) {
      switch (field.type) {
        case 'number': {
          finalValue = Number(rawValue)
          if (Number.isNaN(finalValue)) {
            errors.push({
              key,
              message: `"${key}" must be a valid number`,
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

    values[key] = finalValue
  }

  return {
    valid: errors.length === 0,
    errors,
    values,
  }
}
