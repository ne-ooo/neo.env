import { describe, expect, it } from 'vitest'
import env, {
  config,
  configAsync,
  load,
  loadSync,
  parse,
  parseDetailed,
} from '../../src/index.js'

describe('public API', () => {
  it('exports dotenv-compatible functions', () => {
    expect(config).toBe(env.config)
    expect(parse).toBe(env.parse)
    expect(parse('KEY=value')).toEqual({ KEY: 'value' })
  })

  it('exports the detailed neo.env functions', () => {
    expect(configAsync).toBe(env.configAsync)
    expect(load).toBeTypeOf('function')
    expect(loadSync).toBeTypeOf('function')
    expect(parseDetailed).toBe(env.parseDetailed)
  })
})
