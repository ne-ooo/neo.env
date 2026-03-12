import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { load, loadSync } from '../../src/core/loader.js'

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
  })

  describe('error reporting', () => {
    it('should return errors for invalid lines', () => {
      writeFileSync(testEnvPath, 'VALID=value\nINVALID LINE\nANOTHER=value')

      const result = loadSync({ path: testEnvPath })

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.line).toBe(2)
      expect(result.parsed.VALID).toBe('value')
      expect(result.parsed.ANOTHER).toBe('value')
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
