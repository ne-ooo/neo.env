import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import env, {
  config,
  expand,
  loadSync,
  parse,
  parseDetailed,
  validate,
} from '@lpm.dev/neo.env'

assert.equal(typeof config, 'function')
assert.equal(typeof env.config, 'function')
assert.deepEqual(parse('KEY=value'), { KEY: 'value' })
assert.deepEqual(parseDetailed('API_KEY fictitious-secret').errors, [
  {
    code: 'INVALID_ENTRY',
    line: 1,
    message: 'Invalid environment entry',
  },
])
assert.equal(expand({ HOST: 'localhost', URL: 'https://${HOST}' }).URL, 'https://localhost')
assert.equal(validate({ PORT: '3000' }, { PORT: { type: 'number' } }).values.PORT, 3000)

const prototypeNames = parse('__proto__=proto\nconstructor=ctor\ntoString=text')
assert.equal(Object.getPrototypeOf(prototypeNames), Object.prototype)
assert.equal(Object.hasOwn(prototypeNames, '__proto__'), false)
assert.equal(prototypeNames.constructor, 'ctor')
assert.equal(prototypeNames.toString, 'text')

const atomicEnvironment = {}
writeFileSync('.env', 'VALID=value\nINVALID LINE')
const atomicResult = loadSync({
  processEnv: atomicEnvironment,
})
assert.equal(atomicResult.errors[0]?.code, 'INVALID_ENTRY')
assert.deepEqual(atomicEnvironment, {})

writeFileSync('.env', 'NEO_ENV_ESM_SIDE_EFFECT=esm')
await import('@lpm.dev/neo.env/config')
assert.equal(process.env.NEO_ENV_ESM_SIDE_EFFECT, 'esm')
delete process.env.NEO_ENV_ESM_SIDE_EFFECT
