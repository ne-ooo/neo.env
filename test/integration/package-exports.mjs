import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const projectDirectory = fileURLToPath(new URL('../..', import.meta.url))
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'neo-env-package-'))
const packageDirectory = join(
  temporaryDirectory,
  'node_modules',
  '@lpm.dev',
  'neo.env'
)
const consumerDirectory = join(temporaryDirectory, 'consumer')

try {
  assert.equal(
    temporaryDirectory.startsWith(join(tmpdir(), 'neo-env-package-')),
    true
  )
  mkdirSync(packageDirectory, { recursive: true })
  mkdirSync(consumerDirectory)

  cpSync(join(projectDirectory, 'dist'), join(packageDirectory, 'dist'), {
    recursive: true,
  })
  cpSync(
    join(projectDirectory, 'package.json'),
    join(packageDirectory, 'package.json')
  )

  for (const fixture of ['esm-consumer.mjs', 'cjs-consumer.cjs']) {
    const consumerPath = join(consumerDirectory, fixture)
    cpSync(
      join(projectDirectory, 'test', 'integration', 'fixtures', fixture),
      consumerPath
    )

    const result = spawnSync(process.execPath, [consumerPath], {
      cwd: consumerDirectory,
      encoding: 'utf8',
    })

    assert.equal(
      result.status,
      0,
      `${fixture} failed:\n${result.stdout}${result.stderr}`
    )
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}
