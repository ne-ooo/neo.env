import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { config, load, loadSync } from '../../src/core/loader.js'

describe('loader', () => {
  const originalEnv = { ...process.env }
  const testEnvPath = resolve(process.cwd(), '.env.test-loader')

  beforeEach(() => {
    // Clear process.env for testing
    for (const key in process.env) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    // Restore original process.env
    process.env = { ...originalEnv }

    // Clean up test files
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath)
    }
  })

  describe('loadSync', () => {
    it('should load and parse .env file', () => {
      writeFileSync(testEnvPath, 'KEY=value\nFOO=bar')

      const result = loadSync({ path: testEnvPath })

      expect(result.parsed).toEqual({
        KEY: 'value',
        FOO: 'bar',
      })
      expect(process.env.KEY).toBe('value')
      expect(process.env.FOO).toBe('bar')
    })

    it('should not override existing process.env by default', () => {
      process.env.EXISTING = 'original'
      writeFileSync(testEnvPath, 'EXISTING=new-value')

      loadSync({ path: testEnvPath })

      expect(process.env.EXISTING).toBe('original')
    })

    it('should override process.env when override is true', () => {
      process.env.EXISTING = 'original'
      writeFileSync(testEnvPath, 'EXISTING=new-value')

      loadSync({ path: testEnvPath, override: true })

      expect(process.env.EXISTING).toBe('new-value')
    })

    it('should expand variables when expand is true', () => {
      writeFileSync(testEnvPath, 'HOST=localhost\nPORT=3000\nURL=http://${HOST}:${PORT}')

      const result = loadSync({ path: testEnvPath, expand: true })

      expect(result.parsed.URL).toBe('http://localhost:3000')
      expect(process.env.URL).toBe('http://localhost:3000')
    })

    it('should not expand variables by default', () => {
      writeFileSync(testEnvPath, 'HOST=localhost\nURL=http://${HOST}')

      const result = loadSync({ path: testEnvPath })

      expect(result.parsed.URL).toBe('http://${HOST}')
    })

    it('should use existing environment values during expansion', () => {
      const targetEnv = { HOST: 'runtime.example' }
      writeFileSync(testEnvPath, 'HOST=file.example\nURL=https://${HOST}')

      const result = loadSync({
        path: testEnvPath,
        expand: true,
        processEnv: targetEnv,
      })

      expect(targetEnv.HOST).toBe('runtime.example')
      expect(targetEnv.URL).toBe('https://runtime.example')
      expect(result.parsed.URL).toBe('https://runtime.example')
    })

    it('should use file values during expansion when override is true', () => {
      const targetEnv = { HOST: 'runtime.example' }
      writeFileSync(testEnvPath, 'HOST=file.example\nURL=https://${HOST}')

      loadSync({
        path: testEnvPath,
        expand: true,
        override: true,
        processEnv: targetEnv,
      })

      expect(targetEnv.HOST).toBe('file.example')
      expect(targetEnv.URL).toBe('https://file.example')
    })

    it('should forward non-recursive expansion options', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'A=${B}\nB=${C}\nC=done')

      const result = loadSync({
        path: testEnvPath,
        expand: true,
        recursive: false,
        processEnv: targetEnv,
      })

      expect(result.parsed.A).toBe('${C}')
      expect(result.parsed.B).toBe('done')
    })

    it('should use and populate a custom process environment', () => {
      const targetEnv = { OUTSIDE: 'custom' }
      writeFileSync(testEnvPath, 'A=${OUTSIDE}')

      loadSync({ path: testEnvPath, expand: true, processEnv: targetEnv })

      expect(targetEnv.A).toBe('custom')
      expect(process.env.A).toBeUndefined()
    })

    it('should forward expansion limits', () => {
      writeFileSync(testEnvPath, 'VALUE=1234567890')

      expect(() =>
        loadSync({
          path: testEnvPath,
          expand: true,
          maxOutputLength: 5,
          processEnv: {},
        })
      ).toThrow('exceeded 5 characters')
    })

    it('should forward the aggregate expansion limit', () => {
      writeFileSync(testEnvPath, 'BASE=12345\nFIRST=${BASE}\nSECOND=${BASE}')

      expect(() =>
        loadSync({
          path: testEnvPath,
          expand: true,
          maxOutputLength: 10,
          maxTotalOutputLength: 12,
          processEnv: {},
        })
      ).toThrow('exceeded 12 total characters')
    })

    it('should forward the intermediate expansion-work limit', () => {
      writeFileSync(testEnvPath, 'A=x${B}\nB=x${C}\nC=12345678\nVALUE=${A}')

      expect(() =>
        loadSync({
          path: testEnvPath,
          expand: true,
          maxOutputLength: 50,
          maxTotalOutputLength: 50,
          maxExpansionWorkLength: 15,
          processEnv: {},
        })
      ).toThrow('exceeded 15 intermediate characters')
    })

    it('should reject __proto__ without changing the target environment', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, '__proto__=proto\nconstructor=ctor\ntoString=text')

      const result = loadSync({ path: testEnvPath, processEnv: targetEnv })

      expect(Object.getPrototypeOf(targetEnv)).toBe(Object.prototype)
      expect(Object.hasOwn(targetEnv, '__proto__')).toBe(false)
      expect(result.parsed.constructor).toBe('ctor')
      expect(result.parsed.toString).toBe('text')
      expect(result.errors[0]?.message).toBe(
        'Environment keys cannot use "__proto__"'
      )
      expect(targetEnv).toEqual({})
    })

    it('should reject NUL values without changing the environment', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'GOOD=value\nBAD="before\0after"')

      const result = loadSync({ path: testEnvPath, processEnv: targetEnv })

      expect(result.parsed).toEqual({ GOOD: 'value' })
      expect(result.errors[0]?.message).toBe(
        'Environment values cannot contain NUL characters'
      )
      expect(targetEnv).toEqual({})
    })

    it('should throw error if file does not exist', () => {
      expect(() => {
        loadSync({ path: '/nonexistent/.env' })
      }).toThrow()
    })

    it('should use default .env path if not specified', () => {
      const defaultPath = resolve(process.cwd(), '.env')

      // Skip if .env already exists
      if (!existsSync(defaultPath)) {
        writeFileSync(defaultPath, 'DEFAULT=value')

        try {
          const result = loadSync()
          expect(result.parsed.DEFAULT).toBe('value')
        } finally {
          unlinkSync(defaultPath)
        }
      }
    })
  })

  describe('load (async)', () => {
    it('should load and parse .env file asynchronously', async () => {
      writeFileSync(testEnvPath, 'KEY=value\nFOO=bar')

      const result = await load({ path: testEnvPath })

      expect(result.parsed).toEqual({
        KEY: 'value',
        FOO: 'bar',
      })
      expect(process.env.KEY).toBe('value')
      expect(process.env.FOO).toBe('bar')
    })

    it('should not override existing process.env by default', async () => {
      process.env.EXISTING = 'original'
      writeFileSync(testEnvPath, 'EXISTING=new-value')

      await load({ path: testEnvPath })

      expect(process.env.EXISTING).toBe('original')
    })

    it('should override process.env when override is true', async () => {
      process.env.EXISTING = 'original'
      writeFileSync(testEnvPath, 'EXISTING=new-value')

      await load({ path: testEnvPath, override: true })

      expect(process.env.EXISTING).toBe('new-value')
    })

    it('should expand variables when expand is true', async () => {
      writeFileSync(testEnvPath, 'HOST=localhost\nPORT=3000\nURL=http://${HOST}:${PORT}')

      const result = await load({ path: testEnvPath, expand: true })

      expect(result.parsed.URL).toBe('http://localhost:3000')
      expect(process.env.URL).toBe('http://localhost:3000')
    })

    it('should reject if file does not exist', async () => {
      await expect(load({ path: '/nonexistent/.env' })).rejects.toThrow()
    })

    it('should handle custom encoding', async () => {
      writeFileSync(testEnvPath, 'KEY=value', { encoding: 'utf8' })

      const result = await load({ path: testEnvPath, encoding: 'utf8' })

      expect(result.parsed.KEY).toBe('value')
    })

    it('should reject NUL values atomically', async () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'GOOD=value\nBAD="before\0after"')

      const result = await load({ path: testEnvPath, processEnv: targetEnv })

      expect(result.errors[0]?.message).toBe(
        'Environment values cannot contain NUL characters'
      )
      expect(targetEnv).toEqual({})
    })
  })

  describe('error reporting', () => {
    it('should not mutate the environment when parsing fails', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'VALID=value\nINVALID LINE\nANOTHER=value')

      const result = loadSync({ path: testEnvPath, processEnv: targetEnv })

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.code).toBe('INVALID_ENTRY')
      expect(result.errors[0]?.line).toBe(2)
      expect(result.parsed.VALID).toBe('value')
      expect(result.parsed.ANOTHER).toBe('value')
      expect(targetEnv).toEqual({})
    })

    it('should allow partial mutation only when requested', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'VALID=value\nINVALID LINE')

      const result = loadSync({
        path: testEnvPath,
        processEnv: targetEnv,
        allowPartial: true,
      })

      expect(result.errors).toHaveLength(1)
      expect(targetEnv.VALID).toBe('value')
    })

    it('should keep asynchronous loading atomic', async () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'VALID=value\nINVALID LINE')

      const result = await load({ path: testEnvPath, processEnv: targetEnv })

      expect(result.errors).toHaveLength(1)
      expect(targetEnv).toEqual({})
    })
  })

  describe('dotenv-compatible config', () => {
    it('should return a file error instead of throwing', () => {
      const result = config({ path: '/nonexistent/.env' })

      expect(result.parsed).toEqual({})
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should return parsed values when loading succeeds', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'KEY=value')

      const result = config({ path: testEnvPath, processEnv: targetEnv })

      expect(result).toEqual({ parsed: { KEY: 'value' } })
      expect(targetEnv.KEY).toBe('value')
    })

    it('should preserve dotenv partial parsing by default', () => {
      const targetEnv: Record<string, string> = {}
      writeFileSync(testEnvPath, 'VALID=value\nINVALID LINE')

      const result = config({ path: testEnvPath, processEnv: targetEnv })

      expect(result.parsed).toEqual({ VALID: 'value' })
      expect(targetEnv.VALID).toBe('value')
    })
  })

  describe('real-world usage', () => {
    it('should load a typical .env file', () => {
      const content = `
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp

# API
API_URL=https://api.example.com
API_KEY=secret123
      `.trim()

      writeFileSync(testEnvPath, content)

      const result = loadSync({ path: testEnvPath })

      expect(result.parsed).toEqual({
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'myapp',
        API_URL: 'https://api.example.com',
        API_KEY: 'secret123',
      })
    })
  })
})
