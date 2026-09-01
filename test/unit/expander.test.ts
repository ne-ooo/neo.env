import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { expand, ExpansionError } from '../../src/core/expander.js'

describe('expander', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear process.env for testing
    for (const key in process.env) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    // Restore original process.env
    process.env = { ...originalEnv }
  })

  describe('$VAR syntax', () => {
    it('should expand $VAR references', () => {
      const parsed = {
        HOST: 'localhost',
        URL: 'http://$HOST',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost')
    })

    it('should expand multiple $VAR references', () => {
      const parsed = {
        HOST: 'localhost',
        PORT: '3000',
        URL: 'http://$HOST:$PORT',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost:3000')
    })

    it('should leave unexpanded $VAR if not found', () => {
      const parsed = {
        URL: 'http://$UNKNOWN_VAR',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://$UNKNOWN_VAR')
    })

    it('should only match uppercase variable names', () => {
      const parsed = {
        HOST: 'localhost',
        URL: 'http://$HOST/$lowercase',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost/$lowercase')
    })
  })

  describe('${VAR} syntax', () => {
    it('should expand ${VAR} references', () => {
      const parsed = {
        HOST: 'localhost',
        URL: 'http://${HOST}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost')
    })

    it('should expand multiple ${VAR} references', () => {
      const parsed = {
        HOST: 'localhost',
        PORT: '3000',
        URL: 'http://${HOST}:${PORT}/api',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost:3000/api')
    })

    it('should leave unexpanded ${VAR} if not found', () => {
      const parsed = {
        URL: 'http://${UNKNOWN_VAR}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://${UNKNOWN_VAR}')
    })
  })

  describe('${VAR:-default} syntax', () => {
    it('should use variable value if it exists', () => {
      const parsed = {
        HOST: 'localhost',
        URL: '${HOST:-example.com}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('localhost')
    })

    it('should use default value if variable does not exist', () => {
      const parsed = {
        URL: '${UNKNOWN:-http://localhost:3000}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost:3000')
    })

    it('should handle empty default values', () => {
      const parsed = {
        URL: '${UNKNOWN:-}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('')
    })

    it('should handle complex default values', () => {
      const parsed = {
        URL: '${API_URL:-https://api.example.com/v1}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('https://api.example.com/v1')
    })
  })

  describe('process.env fallback', () => {
    it('should fallback to process.env for $VAR', () => {
      process.env.SYSTEM_VAR = 'from-system'

      const parsed = {
        URL: 'http://$SYSTEM_VAR',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://from-system')
    })

    it('should fallback to process.env for ${VAR}', () => {
      process.env.SYSTEM_VAR = 'from-system'

      const parsed = {
        URL: 'http://${SYSTEM_VAR}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://from-system')
    })

    it('should prefer parsed values over process.env', () => {
      process.env.VAR = 'from-system'

      const parsed = {
        VAR: 'from-parsed',
        URL: 'http://${VAR}',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://from-parsed')
    })

    it('should use custom processEnv if provided', () => {
      const parsed = {
        URL: 'http://${CUSTOM_VAR}',
      }

      const result = expand(parsed, {
        processEnv: { CUSTOM_VAR: 'custom-value' },
      })

      expect(result.URL).toBe('http://custom-value')
    })
  })

  describe('recursive expansion', () => {
    it('should recursively expand variables', () => {
      const parsed = {
        HOST: 'localhost',
        PORT: '3000',
        BASE: 'http://${HOST}:${PORT}',
        API: '${BASE}/api',
      }

      const result = expand(parsed)

      expect(result.API).toBe('http://localhost:3000/api')
    })

    it('should handle multiple levels of recursion', () => {
      const parsed = {
        A: 'value-a',
        B: '${A}',
        C: '${B}',
        D: '${C}',
      }

      const result = expand(parsed)

      expect(result.D).toBe('value-a')
    })

    it('should reject circular references', () => {
      const parsed = {
        A: '${B}',
        B: '${A}',
      }

      expect(() => expand(parsed)).toThrowError(ExpansionError)
      expect(() => expand(parsed)).toThrow('A -> B -> A')
    })

    it('should disable recursion when requested', () => {
      const parsed = {
        HOST: 'localhost',
        BASE: '${HOST}',
        API: '${BASE}/api',
      }

      const result = expand(parsed, { recursive: false })

      // Only one level of expansion - ${BASE} expands to ${HOST}, but ${HOST} doesn't expand further
      expect(result.BASE).toBe('localhost')
      expect(result.API).toBe('${HOST}/api')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      const parsed = {
        EMPTY: '',
        URL: 'http://${EMPTY}localhost',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost')
    })

    it('should handle values with no variables', () => {
      const parsed = {
        STATIC: 'no variables here',
      }

      const result = expand(parsed)

      expect(result.STATIC).toBe('no variables here')
    })

    it('should handle escaped dollar signs', () => {
      const parsed = {
        PRICE: 'Cost: $100',
      }

      const result = expand(parsed)

      // Since $1 doesn't match the pattern, it should be preserved
      expect(result.PRICE).toBe('Cost: $100')
    })

    it('should preserve escaped variable references', () => {
      const parsed = {
        TOKEN: 'secret',
        PASSWORD: 'pa\\$TOKEN',
      }

      const result = expand(parsed)

      expect(result.PASSWORD).toBe('pa$TOKEN')
    })

    it('should use a default for an empty value', () => {
      const parsed = {
        EMPTY: '',
        VALUE: '${EMPTY:-fallback}',
      }

      const result = expand(parsed)

      expect(result.VALUE).toBe('fallback')
    })

    it('should reject output that exceeds the configured limit', () => {
      const parsed = {
        LARGE: '1234567890',
      }

      expect(() => expand(parsed, { maxOutputLength: 5 })).toThrow(
        'exceeded 5 characters'
      )
    })

    it('should reject aggregate output that exceeds the configured limit', () => {
      const parsed = {
        BASE: '12345',
        FIRST: '${BASE}',
        SECOND: '${BASE}',
      }

      let error: unknown
      try {
        expand(parsed, {
          processEnv: {},
          maxOutputLength: 10,
          maxTotalOutputLength: 12,
        })
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(ExpansionError)
      expect(error).toMatchObject({
        code: 'MAX_TOTAL_OUTPUT_LENGTH',
        variable: 'SECOND',
      })
      expect((error as Error).message).toContain('exceeded 12 total characters')
    })

    it('should reject excessive intermediate expansion work', () => {
      const processEnv = {
        A: `x\${B}`,
        B: `x\${C}`,
        C: '12345678',
      }

      expect(() =>
        expand(
          { VALUE: '${A}' },
          {
            processEnv,
            maxOutputLength: 20,
            maxTotalOutputLength: 20,
            maxExpansionWorkLength: 15,
          }
        )
      ).toThrow('exceeded 15 intermediate characters')
    })

    it('should charge token scans that resolve to empty output', () => {
      const value = '$EMPTY'.repeat(10)

      expect(() =>
        expand(
          { VALUE: value },
          {
            processEnv: { EMPTY: '' },
            maxExpansionWorkLength: value.length - 1,
          }
        )
      ).toThrow(`exceeded ${value.length - 1} intermediate characters`)
    })

    it('should charge non-recursive reference unescaping', () => {
      const referenced = '\\$'.repeat(100)

      expect(() =>
        expand(
          { VALUE: '${A}' },
          {
            parsed: { A: referenced },
            processEnv: {},
            recursive: false,
            maxOutputLength: 500,
            maxTotalOutputLength: 500,
            maxExpansionWorkLength: 150,
          }
        )
      ).toThrow('exceeded 150 intermediate characters')
    })

    it('should reject unsafe custom recursion limits', () => {
      expect(() => expand({ VALUE: 'safe' }, { maxDepth: 257 })).toThrow(
        'maxDepth must be at most 256'
      )
    })

    it('should report the configured depth limit before the call stack overflows', () => {
      const parsed = Object.fromEntries(
        Array.from({ length: 258 }, (_, index) => [
          `KEY_${index}`,
          index === 257 ? 'done' : `\${KEY_${index + 1}}`,
        ])
      )

      expect(() =>
        expand(parsed, { processEnv: {}, maxDepth: 256 })
      ).toThrowError(ExpansionError)
      expect(() =>
        expand(parsed, { processEnv: {}, maxDepth: 256 })
      ).toThrow('exceeded a depth of 256')
    })

    it('should reject self-amplifying references before allocation grows', () => {
      const parsed = {
        A: '$A$A$A',
      }

      expect(() => expand(parsed)).toThrowError(ExpansionError)
      expect(() => expand(parsed)).toThrow('A -> A')
    })

    it('should expand a wide graph with shared references', () => {
      const parsed = {
        ROOT: '/srv/application',
        SHARED: '${ROOT}/shared',
        ...Object.fromEntries(
          Array.from({ length: 1_000 }, (_, index) => [
            `PATH_${index}`,
            `\${SHARED}/service-${index}`,
          ])
        ),
      }

      const result = expand(parsed, { processEnv: {} })

      expect(result.PATH_0).toBe('/srv/application/shared/service-0')
      expect(result.PATH_999).toBe('/srv/application/shared/service-999')
    })

    it('should not inspect unrelated process environment values', () => {
      const processEnv: Record<string, string> = {}
      Object.defineProperty(processEnv, 'UNRELATED', {
        enumerable: true,
        get() {
          throw new Error('Unrelated environment value was read')
        },
      })

      expect(expand({ STATIC: 'value' }, { processEnv })).toEqual({
        STATIC: 'value',
      })
    })

    it('should preserve escaped dollars when all private-use characters exist', () => {
      const privateUseCharacters = Array.from({ length: 0x1900 }, (_, index) =>
        String.fromCodePoint(0xe000 + index)
      ).join('')

      const result = expand(
        { TOKEN: 'secret', VALUE: `${privateUseCharacters}\\$TOKEN` },
        { processEnv: {} }
      )

      expect(result.VALUE).toBe(`${privateUseCharacters}$TOKEN`)
    })

    it('should scan malformed braced references in linear time', () => {
      const malformedNames = '${'.repeat(100_000)
      const malformedDefaults = '${MISSING:-'.repeat(20_000)

      expect(expand({ VALUE: malformedNames }, { processEnv: {} }).VALUE).toBe(
        malformedNames
      )
      expect(
        expand({ VALUE: malformedDefaults }, { processEnv: {} }).VALUE
      ).toBe(malformedDefaults)
    })

    it('should handle mixed syntax in same value', () => {
      const parsed = {
        HOST: 'localhost',
        PORT: '3000',
        URL: 'http://${HOST}:$PORT',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost:3000')
    })

    it('should not resolve inherited prototype names', () => {
      const result = expand(
        { VALUE: '${toString}:${constructor}:${__proto__}' },
        { processEnv: {} }
      )

      expect(result.VALUE).toBe('${toString}:${constructor}:${__proto__}')
    })

    it('should reject own __proto__ output keys', () => {
      const parsed: Record<string, string> = { VALUE: '${__proto__}' }
      Object.defineProperty(parsed, '__proto__', {
        value: 'safe',
        enumerable: true,
      })

      expect(() => expand(parsed, { processEnv: {} })).toThrow(
        'Environment keys cannot use "__proto__"'
      )
    })
  })

  describe('real-world examples', () => {
    it('should expand database connection strings', () => {
      const parsed = {
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'myapp',
        DB_USER: 'admin',
        DB_PASS: 'secret',
        DATABASE_URL: 'postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}',
      }

      const result = expand(parsed)

      expect(result.DATABASE_URL).toBe('postgres://admin:secret@localhost:5432/myapp')
    })

    it('should expand API URLs with defaults', () => {
      const parsed = {
        API_URL: '${BASE_URL:-http://localhost:3000}/api/v1',
      }

      const result = expand(parsed)

      expect(result.API_URL).toBe('http://localhost:3000/api/v1')
    })

    it('should handle complex multi-level configs', () => {
      process.env.NODE_ENV = 'development'

      const parsed = {
        ENV: '$NODE_ENV',
        IS_DEV: '${ENV}',
        LOG_LEVEL: '${IS_DEV:-info}',
      }

      const result = expand(parsed)

      expect(result.ENV).toBe('development')
      expect(result.IS_DEV).toBe('development')
      expect(result.LOG_LEVEL).toBe('development')
    })
  })
})
