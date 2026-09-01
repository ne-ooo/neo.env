import { describe, it, expect } from 'vitest'
import { validate } from '../../src/core/validator.js'
import type { Schema } from '../../src/types.js'

describe('validator', () => {
  describe('string type', () => {
    it('should validate string values', () => {
      const parsed = { NAME: 'John Doe' }
      const schema: Schema = { NAME: { type: 'string' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.NAME).toBe('John Doe')
    })

    it('should use string as default type', () => {
      const parsed = { NAME: 'John Doe' }
      const schema: Schema = { NAME: {} }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.NAME).toBe('John Doe')
    })
  })

  describe('number type', () => {
    it('should coerce valid numbers', () => {
      const parsed = { PORT: '3000' }
      const schema: Schema = { PORT: { type: 'number' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe(3000)
      expect(typeof result.values.PORT).toBe('number')
    })

    it('should coerce decimal numbers', () => {
      const parsed = { RATE: '3.14' }
      const schema: Schema = { RATE: { type: 'number' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.RATE).toBe(3.14)
    })

    it('should reject invalid numbers', () => {
      const parsed = { PORT: 'not-a-number' }
      const schema: Schema = { PORT: { type: 'number' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.key).toBe('PORT')
      expect(result.errors[0]?.message).toContain('valid number')
    })

    it('should accept decimal exponents and reject non-decimal literals', () => {
      const schema: Schema = {
        EXPONENT: { type: 'number' },
        HEX: { type: 'number' },
        BINARY: { type: 'number' },
      }

      const result = validate(
        { EXPONENT: '1.5e2', HEX: '0x10', BINARY: '0b10' },
        schema
      )

      expect(result.valid).toBe(false)
      expect(result.values.EXPONENT).toBe(150)
      expect(result.values.HEX).toBeUndefined()
      expect(result.values.BINARY).toBeUndefined()
      expect(result.errors).toHaveLength(2)
    })

    it('should reject finite-syntax values that overflow', () => {
      const result = validate(
        { LIMIT: '1e999' },
        { LIMIT: { type: 'number' } }
      )

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('finite number')
    })
  })

  describe('boolean type', () => {
    it('should coerce "true" to boolean true', () => {
      const parsed = { ENABLED: 'true' }
      const schema: Schema = { ENABLED: { type: 'boolean' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.ENABLED).toBe(true)
      expect(typeof result.values.ENABLED).toBe('boolean')
    })

    it('should coerce "false" to boolean false', () => {
      const parsed = { ENABLED: 'false' }
      const schema: Schema = { ENABLED: { type: 'boolean' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.ENABLED).toBe(false)
    })

    it('should be case-insensitive', () => {
      const parsed = { FLAG1: 'TRUE', FLAG2: 'FALSE' }
      const schema: Schema = {
        FLAG1: { type: 'boolean' },
        FLAG2: { type: 'boolean' },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.FLAG1).toBe(true)
      expect(result.values.FLAG2).toBe(false)
    })

    it('should coerce "1" to true and "0" to false', () => {
      const parsed = { FLAG1: '1', FLAG2: '0' }
      const schema: Schema = {
        FLAG1: { type: 'boolean' },
        FLAG2: { type: 'boolean' },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.FLAG1).toBe(true)
      expect(result.values.FLAG2).toBe(false)
    })

    it('should reject invalid boolean values', () => {
      const parsed = { ENABLED: 'yes' }
      const schema: Schema = { ENABLED: { type: 'boolean' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('boolean')
    })
  })

  describe('url type', () => {
    it('should validate valid URLs', () => {
      const parsed = { API_URL: 'https://api.example.com' }
      const schema: Schema = { API_URL: { type: 'url' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.API_URL).toBe('https://api.example.com')
    })

    it('should accept different protocols', () => {
      const parsed = {
        HTTP_URL: 'http://example.com',
        WS_URL: 'ws://example.com',
        FTP_URL: 'ftp://example.com',
      }
      const schema: Schema = {
        HTTP_URL: { type: 'url' },
        WS_URL: { type: 'url' },
        FTP_URL: { type: 'url' },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid URLs', () => {
      const parsed = { API_URL: 'not-a-valid-url' }
      const schema: Schema = { API_URL: { type: 'url' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('valid URL')
    })
  })

  describe('email type', () => {
    it('should validate valid emails', () => {
      const parsed = { EMAIL: 'user@example.com' }
      const schema: Schema = { EMAIL: { type: 'email' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.EMAIL).toBe('user@example.com')
    })

    it('should reject invalid emails', () => {
      const parsed = { EMAIL: 'not-an-email' }
      const schema: Schema = { EMAIL: { type: 'email' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('valid email')
    })
  })

  describe('json type', () => {
    it('should parse valid JSON', () => {
      const parsed = { CONFIG: '{"key": "value"}' }
      const schema: Schema = { CONFIG: { type: 'json' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.CONFIG).toEqual({ key: 'value' })
    })

    it('should parse JSON arrays', () => {
      const parsed = { ITEMS: '[1, 2, 3]' }
      const schema: Schema = { ITEMS: { type: 'json' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.ITEMS).toEqual([1, 2, 3])
    })

    it('should reject invalid JSON', () => {
      const parsed = { CONFIG: '{invalid json}' }
      const schema: Schema = { CONFIG: { type: 'json' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('valid JSON')
    })
  })

  describe('required fields', () => {
    it('should pass when required field is present', () => {
      const parsed = { API_KEY: 'secret123' }
      const schema: Schema = { API_KEY: { required: true } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
    })

    it('should fail when required field is missing', () => {
      const parsed = {}
      const schema: Schema = { API_KEY: { required: true } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.key).toBe('API_KEY')
      expect(result.errors[0]?.message).toContain('missing')
    })

    it('should treat a present empty string as present', () => {
      const result = validate(
        { VALUE: '' },
        { VALUE: { type: 'string', required: true, default: 'fallback' } }
      )

      expect(result.valid).toBe(true)
      expect(result.values.VALUE).toBe('')
    })
  })

  describe('default values', () => {
    it('should use default value when field is missing', () => {
      const parsed = {}
      const schema: Schema = { PORT: { default: '3000' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe('3000')
    })

    it('should not use default when field is present', () => {
      const parsed = { PORT: '8080' }
      const schema: Schema = { PORT: { default: '3000' } }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe('8080')
    })

    it('should coerce default values', () => {
      const schema: Schema = {
        PORT: { type: 'number', default: '3000' },
        DEBUG: { type: 'boolean', default: 'false' },
      }

      const result = validate({}, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe(3000)
      expect(result.values.DEBUG).toBe(false)
    })

    it('should reject defaults that fail validation', () => {
      const schema: Schema = {
        MODE: { enum: ['production'], default: 'invalid' },
        ENDPOINT: { type: 'url', default: 'not a url' },
        RETRY_LIMIT: { type: 'number', default: 'Infinity' },
      }

      const result = validate({}, schema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.values).toEqual({})
    })

    it('should let a valid default satisfy a required field', () => {
      const schema: Schema = {
        PORT: { type: 'number', required: true, default: '3000' },
      }

      const result = validate({}, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe(3000)
    })

    it('should preserve an empty string default', () => {
      const result = validate({}, { VALUE: { default: '' } })

      expect(result.valid).toBe(true)
      expect(result.values).toEqual({ VALUE: '' })
    })
  })

  describe('enum validation', () => {
    it('should pass when value is in enum', () => {
      const parsed = { NODE_ENV: 'production' }
      const schema: Schema = {
        NODE_ENV: { enum: ['development', 'production', 'test'] },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
    })

    it('should fail when value is not in enum', () => {
      const parsed = { NODE_ENV: 'invalid' }
      const schema: Schema = {
        NODE_ENV: { enum: ['development', 'production', 'test'] },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('must be one of')
    })
  })

  describe('pattern validation', () => {
    it('should pass when value matches pattern', () => {
      const parsed = { VERSION: 'v1.2.3' }
      const schema: Schema = {
        VERSION: { pattern: /^v\d+\.\d+\.\d+$/ },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
    })

    it('should fail when value does not match pattern', () => {
      const parsed = { VERSION: 'invalid' }
      const schema: Schema = {
        VERSION: { pattern: /^v\d+\.\d+\.\d+$/ },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('does not match')
    })

    it('should give stable results for global patterns', () => {
      const pattern = /^ok$/g
      pattern.lastIndex = 1
      const schema: Schema = { TOKEN: { pattern } }

      const first = validate({ TOKEN: 'ok' }, schema)
      const second = validate({ TOKEN: 'ok' }, schema)

      expect(first.valid).toBe(true)
      expect(second.valid).toBe(true)
      expect(pattern.lastIndex).toBe(1)
    })
  })

  describe('prototype-like field names', () => {
    it('should treat inherited names as missing', () => {
      const schema: Schema = {
        toString: { required: true },
        constructor: { required: true },
      }

      const result = validate({}, schema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('should reject an own __proto__ schema field', () => {
      const parsed: Record<string, string> = {}
      const schema: Schema = {}
      Object.defineProperty(parsed, '__proto__', {
        value: 'safe',
        enumerable: true,
      })
      Object.defineProperty(schema, '__proto__', {
        value: { type: 'string' },
        enumerable: true,
      })

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(Object.getPrototypeOf(result.values)).toBe(Object.prototype)
      expect(Object.hasOwn(result.values, '__proto__')).toBe(false)
      expect(result.errors[0]?.message).toBe(
        'Environment keys cannot use "__proto__"'
      )
    })
  })

  describe('custom transforms', () => {
    it('should apply custom transform', () => {
      const parsed = { ITEMS: 'a,b,c' }
      const schema: Schema = {
        ITEMS: {
          transform: (value) => value.split(','),
        },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.ITEMS).toEqual(['a', 'b', 'c'])
    })

    it('should catch transform errors', () => {
      const parsed = { DATA: 'value' }
      const schema: Schema = {
        DATA: {
          transform: () => {
            throw new Error('Transform failed')
          },
        },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors[0]?.message).toContain('Transform failed')
    })

    it('should not expose transform error details', () => {
      const result = validate(
        { API_KEY: 'secret-canary' },
        {
          API_KEY: {
            transform: (value) => {
              throw new Error(`Rejected value: ${value}`)
            },
          },
        }
      )

      expect(result.errors[0]?.message).toBe('Transform failed for "API_KEY"')
      expect(JSON.stringify(result.errors)).not.toContain('secret-canary')
    })
  })

  describe('multiple fields', () => {
    it('should validate multiple fields', () => {
      const parsed = {
        PORT: '3000',
        DEBUG: 'true',
        API_URL: 'https://api.example.com',
      }
      const schema: Schema = {
        PORT: { type: 'number', required: true },
        DEBUG: { type: 'boolean' },
        API_URL: { type: 'url', required: true },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe(3000)
      expect(result.values.DEBUG).toBe(true)
      expect(result.values.API_URL).toBe('https://api.example.com')
    })

    it('should collect multiple errors', () => {
      const parsed = {
        PORT: 'invalid',
        API_URL: 'not-a-url',
      }
      const schema: Schema = {
        PORT: { type: 'number', required: true },
        DEBUG: { required: true },
        API_URL: { type: 'url' },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
    })
  })

  describe('real-world scenarios', () => {
    it('should validate a typical configuration', () => {
      const parsed = {
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: 'postgres://localhost:5432/mydb',
        ENABLE_CACHE: 'true',
        LOG_LEVEL: 'info',
      }

      const schema: Schema = {
        NODE_ENV: {
          required: true,
          enum: ['development', 'production', 'test'],
        },
        PORT: {
          type: 'number',
          required: true,
        },
        DATABASE_URL: {
          type: 'url',
          required: true,
        },
        ENABLE_CACHE: {
          type: 'boolean',
          default: 'false',
        },
        LOG_LEVEL: {
          enum: ['debug', 'info', 'warn', 'error'],
          default: 'info',
        },
      }

      const result = validate(parsed, schema)

      expect(result.valid).toBe(true)
      expect(result.values.PORT).toBe(8080)
      expect(result.values.ENABLE_CACHE).toBe(true)
    })
  })
})
