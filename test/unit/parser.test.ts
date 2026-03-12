import { describe, it, expect } from 'vitest'
import { parse } from '../../src/core/parser.js'

describe('parser', () => {
  describe('basic parsing', () => {
    it('should parse simple key=value pairs', () => {
      const content = 'KEY=value\nFOO=bar'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value',
        FOO: 'bar',
      })
      expect(result.errors).toEqual([])
    })

    it('should parse keys with underscores', () => {
      const content = 'MY_KEY=value\nANOTHER_KEY_123=bar'
      const result = parse(content)

      expect(result.parsed).toEqual({
        MY_KEY: 'value',
        ANOTHER_KEY_123: 'bar',
      })
    })

    it('should parse keys with dots and hyphens', () => {
      const content = 'my.key=value\nmy-key=bar'
      const result = parse(content)

      expect(result.parsed).toEqual({
        'my.key': 'value',
        'my-key': 'bar',
      })
    })

    it('should handle empty values', () => {
      const content = 'EMPTY='
      const result = parse(content)

      expect(result.parsed).toEqual({
        EMPTY: '',
      })
    })
  })

  describe('quoted values', () => {
    it('should parse double-quoted values', () => {
      const content = 'KEY="value with spaces"'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value with spaces',
      })
    })

    it('should parse single-quoted values', () => {
      const content = "KEY='value with spaces'"
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value with spaces',
      })
    })

    it('should parse backtick-quoted values', () => {
      const content = 'KEY=`value with spaces`'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value with spaces',
      })
    })

    it('should preserve quotes in quoted values', () => {
      const content = 'KEY="value with \\"nested\\" quotes"'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value with "nested" quotes',
      })
    })
  })

  describe('escape sequences', () => {
    it('should unescape \\n in quoted values', () => {
      const content = 'KEY="line1\\nline2"'
      const result = parse(content)

      expect(result.parsed.KEY).toBe('line1\nline2')
    })

    it('should unescape \\r in quoted values', () => {
      const content = 'KEY="line1\\rline2"'
      const result = parse(content)

      expect(result.parsed.KEY).toBe('line1\rline2')
    })

    it('should unescape \\t in quoted values', () => {
      const content = 'KEY="tab\\there"'
      const result = parse(content)

      expect(result.parsed.KEY).toBe('tab\there')
    })

    it('should unescape \\\\ in quoted values', () => {
      const content = 'KEY="back\\\\slash"'
      const result = parse(content)

      expect(result.parsed.KEY).toBe('back\\slash')
    })
  })

  describe('comments', () => {
    it('should skip comment lines', () => {
      const content = '# This is a comment\nKEY=value'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value',
      })
    })

    it('should strip inline comments from unquoted values', () => {
      const content = 'KEY=value # this is a comment'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value',
      })
    })

    it('should preserve # in quoted values', () => {
      const content = 'KEY="value # not a comment"'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value # not a comment',
      })
    })

    it('should skip empty lines', () => {
      const content = 'KEY1=value1\n\n\nKEY2=value2'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
      })
    })
  })

  describe('export prefix', () => {
    it('should parse lines with export prefix', () => {
      const content = 'export KEY=value'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value',
      })
    })

    it('should parse mixed export and non-export lines', () => {
      const content = 'export KEY1=value1\nKEY2=value2\nexport KEY3=value3'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
      })
    })
  })

  describe('whitespace handling', () => {
    it('should trim whitespace around keys and values', () => {
      const content = '  KEY  =  value  '
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: 'value',
      })
    })

    it('should preserve whitespace in quoted values', () => {
      const content = 'KEY="  value  "'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY: '  value  ',
      })
    })
  })

  describe('error handling', () => {
    it('should report invalid line format', () => {
      const content = 'INVALID LINE WITHOUT EQUALS'
      const result = parse(content)

      expect(result.parsed).toEqual({})
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.line).toBe(1)
      expect(result.errors[0]?.message).toContain('Invalid line format')
    })

    it('should report multiple errors', () => {
      const content = 'KEY1=value1\nINVALID LINE 1\nKEY2=value2\nINVALID LINE 2'
      const result = parse(content)

      expect(result.parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
      })
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]?.line).toBe(2)
      expect(result.errors[1]?.line).toBe(4)
    })

    it('should include line numbers in errors', () => {
      const content = '# Comment\n\nINVALID'
      const result = parse(content)

      expect(result.errors[0]?.line).toBe(3)
    })
  })

  describe('real-world examples', () => {
    it('should parse a typical .env file', () => {
      const content = `
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp

# API
API_URL="https://api.example.com"
API_KEY=secret123

# Feature flags
ENABLE_FEATURE_X=true
      `.trim()

      const result = parse(content)

      expect(result.parsed).toEqual({
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'myapp',
        API_URL: 'https://api.example.com',
        API_KEY: 'secret123',
        ENABLE_FEATURE_X: 'true',
      })
      expect(result.errors).toEqual([])
    })

    it('should handle mixed quote styles', () => {
      const content = `
SINGLE='single quoted'
DOUBLE="double quoted"
BACKTICK=\`backtick quoted\`
UNQUOTED=no quotes
      `.trim()

      const result = parse(content)

      expect(result.parsed).toEqual({
        SINGLE: 'single quoted',
        DOUBLE: 'double quoted',
        BACKTICK: 'backtick quoted',
        UNQUOTED: 'no quotes',
      })
    })
  })
})
