import { describe, expect, it } from 'vitest'
import dotenv from 'dotenv'
import { parse, parseDetailed } from '../../src/core/parser.js'

describe('parser', () => {
  describe('dotenv-compatible parse API', () => {
    it('returns the parsed record directly', () => {
      expect(parse('KEY=value\nFOO=bar')).toEqual({ KEY: 'value', FOO: 'bar' })
    })

    it('accepts Buffer input', () => {
      expect(parse(Buffer.from('KEY=value'))).toEqual({ KEY: 'value' })
    })

    it('does not consume the next entry after an empty value', () => {
      const content = 'EMPTY=\nNEXT=value\n\nLAST=done'

      expect(parse(content)).toEqual(dotenv.parse(content))
      expect(parse(content)).toEqual({
        EMPTY: '',
        NEXT: 'value',
        LAST: 'done',
      })
    })

    const compatibilityCases: Array<[string, string]> = [
      ['simple values', 'KEY=value\nEMPTY='],
      ['supported key characters', 'my.key=value\nmy-key=other\nMY_KEY_123=data'],
      ['export prefix', 'export KEY=value\nOTHER=data'],
      ['colon delimiter', 'KEY: value'],
      ['comments', '# comment\nA=value#comment\nB="value # text" # comment'],
      ['quote styles', 'A="double value"\nB=\'single value\'\nC=`backtick value`'],
      ['double-quote newlines', 'A="line1\\nline2\\rline3"'],
      ['single-quote escapes', "A='line1\\nline2'"],
      ['escaped double quote', 'A="say \\"hello\\""'],
      ['multiline value', 'A="line1\nline2"\nB=after'],
      ['Windows line endings', 'A=one\r\nB=two\r\n'],
      ['whitespace', '  A  =  value  \nB="  quoted  "'],
      ['invalid entries', 'A=one\nINVALID ENTRY\nB=two'],
    ]

    for (const [name, content] of compatibilityCases) {
      it(`matches dotenv for ${name}`, () => {
        expect(parse(content)).toEqual(dotenv.parse(content))
      })
    }
  })

  describe('parseDetailed API', () => {
    it('returns parsed values and line-numbered errors', () => {
      const result = parseDetailed('A=one\nINVALID ENTRY\nB=two')

      expect(result.parsed).toEqual({ A: 'one', B: 'two' })
      expect(result.errors).toEqual([
        {
          code: 'INVALID_ENTRY',
          line: 2,
          message: 'Invalid environment entry',
        },
      ])
    })

    it('does not include invalid content in error messages', () => {
      const result = parseDetailed('API_KEY fictitious-secret')

      expect(result.errors[0]?.message).toBe('Invalid environment entry')
      expect(result.errors[0]?.code).toBe('INVALID_ENTRY')
      expect(result.errors[0]?.message).not.toContain('fictitious-secret')
    })

    it('reports NUL values without returning them', () => {
      const result = parseDetailed('GOOD=value\nBAD="before\0after"')

      expect(result.parsed).toEqual({ GOOD: 'value' })
      expect(result.errors).toEqual([
        {
          code: 'INVALID_ENTRY',
          line: 2,
          message: 'Environment values cannot contain NUL characters',
        },
      ])
    })

    it('rejects __proto__ and stores other prototype-like names', () => {
      const result = parse('__proto__=proto\nconstructor=ctor\ntoString=text')

      expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
      expect(Object.hasOwn(result, '__proto__')).toBe(false)
      expect(Object.hasOwn(result, 'constructor')).toBe(true)
      expect(Object.hasOwn(result, 'toString')).toBe(true)
      expect(result.constructor).toBe('ctor')
      expect(result.toString).toBe('text')
    })

    it('reports __proto__ as an invalid detailed entry', () => {
      const result = parseDetailed('__proto__=proto\nSAFE=value')

      expect(result.parsed).toEqual({ SAFE: 'value' })
      expect(result.errors).toEqual([
        {
          code: 'INVALID_ENTRY',
          line: 1,
          message: 'Environment keys cannot use "__proto__"',
        },
      ])
    })

    it('does not report comments or empty lines', () => {
      const result = parseDetailed('# comment\n\nA=value\n')

      expect(result.parsed).toEqual({ A: 'value' })
      expect(result.errors).toEqual([])
    })

    it('does not report lines inside multiline quoted values', () => {
      const result = parseDetailed('A="line1\nline2\nline3"')

      expect(result.parsed.A).toBe('line1\nline2\nline3')
      expect(result.errors).toEqual([])
    })

    it('reports special-entry errors on the physical entry line', () => {
      const result = parseDetailed(
        '# comment\n\n__proto__=value\n\nBAD="before\0after"'
      )

      expect(result.errors).toEqual([
        {
          code: 'INVALID_ENTRY',
          line: 3,
          message: 'Environment keys cannot use "__proto__"',
        },
        {
          code: 'INVALID_ENTRY',
          line: 5,
          message: 'Environment values cannot contain NUL characters',
        },
      ])
    })

    it('does not let colon separators consume the next line', () => {
      const result = parseDetailed('BROKEN:\nNEXT=value')

      expect(result.parsed).toEqual({ NEXT: 'value' })
      expect(result.errors).toEqual([
        {
          code: 'INVALID_ENTRY',
          line: 1,
          message: 'Invalid environment entry',
        },
      ])
    })

    it('scans large blank input in linear time', () => {
      const result = parseDetailed(' \n'.repeat(50_000))

      expect(result).toEqual({ parsed: {}, errors: [] })
    })

    it('caps diagnostics for invalid input', () => {
      const result = parseDetailed('INVALID ENTRY\n'.repeat(1_000))

      expect(result.errors).toHaveLength(101)
      expect(result.errors.at(-1)).toEqual({
        code: 'TOO_MANY_ERRORS',
        line: 101,
        message: 'Additional parse errors were omitted after 100 errors',
      })
    })
  })
})
