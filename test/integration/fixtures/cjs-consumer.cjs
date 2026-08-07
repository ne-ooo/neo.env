const assert = require('node:assert/strict')
const { writeFileSync } = require('node:fs')
const env = require('@lpm.dev/neo.env')

assert.equal(typeof env.config, 'function')
assert.equal(typeof env.default.config, 'function')
assert.deepEqual(env.parse('KEY=value'), { KEY: 'value' })
assert.equal(
  env.expand({ HOST: 'localhost', URL: 'https://${HOST}' }).URL,
  'https://localhost'
)
assert.equal(
  env.validate({ PORT: '3000' }, { PORT: { type: 'number' } }).values.PORT,
  3000
)

writeFileSync('.env', 'NEO_ENV_CJS_SIDE_EFFECT=cjs')
require('@lpm.dev/neo.env/config')
assert.equal(process.env.NEO_ENV_CJS_SIDE_EFFECT, 'cjs')
delete process.env.NEO_ENV_CJS_SIDE_EFFECT
