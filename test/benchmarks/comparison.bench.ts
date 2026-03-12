import { bench, describe } from 'vitest'
import dotenvOriginal from 'dotenv'
import { parse as parseNeo } from '../../src/core/parser.js'
import { expand as expandNeo } from '../../src/core/expander.js'

describe('Benchmark: neo.env vs dotenv', () => {
  const smallEnv = `
KEY1=value1
KEY2=value2
KEY3=value3
  `.trim()

  const largeEnv = Array.from({ length: 100 }, (_, i) => `KEY${i}=value${i}`).join('\n')

  const envWithComments = `
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp

# API configuration
API_URL=https://api.example.com
API_KEY=secret123

# Feature flags
ENABLE_CACHE=true
ENABLE_LOGGING=false
  `.trim()

  const envWithQuotes = `
SINGLE='single quoted value'
DOUBLE="double quoted value"
BACKTICK=\`backtick quoted value\`
UNQUOTED=unquoted value
  `.trim()

  const envWithEscapes = `
NEWLINE="line1\\nline2"
TAB="col1\\tcol2"
QUOTE="He said \\"hello\\""
  `.trim()

  const envWithVariables = `
HOST=localhost
PORT=3000
DATABASE_URL=postgres://\${HOST}:5432/db
API_URL=http://\${HOST}:\${PORT}/api
  `.trim()

  describe('Parse Performance', () => {
    bench('dotenv - parse small', () => {
      dotenvOriginal.parse(smallEnv)
    })

    bench('neo.env - parse small', () => {
      parseNeo(smallEnv)
    })

    bench('dotenv - parse large', () => {
      dotenvOriginal.parse(largeEnv)
    })

    bench('neo.env - parse large', () => {
      parseNeo(largeEnv)
    })

    bench('dotenv - parse with comments', () => {
      dotenvOriginal.parse(envWithComments)
    })

    bench('neo.env - parse with comments', () => {
      parseNeo(envWithComments)
    })
  })

  describe('Quote Handling', () => {
    bench('dotenv - quoted values', () => {
      dotenvOriginal.parse(envWithQuotes)
    })

    bench('neo.env - quoted values', () => {
      parseNeo(envWithQuotes)
    })

    bench('dotenv - escape sequences', () => {
      dotenvOriginal.parse(envWithEscapes)
    })

    bench('neo.env - escape sequences', () => {
      parseNeo(envWithEscapes)
    })
  })

  describe('Variable Expansion (neo.env feature)', () => {
    bench('neo.env - variable expansion', () => {
      const parsed = parseNeo(envWithVariables)
      expandNeo(parsed.parsed)
    })

    bench('neo.env - parse + expand', () => {
      const parsed = parseNeo(envWithVariables)
      expandNeo(parsed.parsed)
    })
  })

  describe('Real-world scenario', () => {
    const realWorld = `
# Production configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=production_db
DB_USER=admin
DB_PASS="s3cr3t!p@ssw0rd"
DATABASE_URL=postgres://\${DB_USER}:\${DB_PASS}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}

# Redis
REDIS_URL=redis://cache.example.com:6379

# API
API_URL=https://api.example.com
API_KEY="sk_live_1234567890abcdef"
API_TIMEOUT=30000

# Features
ENABLE_CACHE=true
ENABLE_LOGGING=true
LOG_LEVEL=info
    `.trim()

    bench('dotenv - real-world parsing', () => {
      dotenvOriginal.parse(realWorld)
    })

    bench('neo.env - real-world parsing', () => {
      parseNeo(realWorld)
    })

    bench('neo.env - real-world with expansion', () => {
      const parsed = parseNeo(realWorld)
      expandNeo(parsed.parsed)
    })
  })
})
