import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { expand } from '../../src/core/expander.js'

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

    it('should prevent infinite recursion', () => {
      const parsed = {
        A: '${B}',
        B: '${A}',
      }

      const result = expand(parsed)

      // Should not crash, just stop at max depth
      expect(result).toBeDefined()
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

    it('should handle mixed syntax in same value', () => {
      const parsed = {
        HOST: 'localhost',
        PORT: '3000',
        URL: 'http://${HOST}:$PORT',
      }

      const result = expand(parsed)

      expect(result.URL).toBe('http://localhost:3000')
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
