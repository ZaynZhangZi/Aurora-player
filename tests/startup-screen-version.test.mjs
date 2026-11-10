import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import test from 'node:test'
import {build} from 'vite'
import {startupScreenVersion} from '../vite.config.js'

test('real builds version the independent startup script from its contents on every release', async t => {
  const root = await mkdtemp(join(tmpdir(), 'aurora-startup-version-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  await mkdir(join(root, 'public'))
  const script = join(root, 'public', 'aurora-loading.js')
  await writeFile(join(root, 'index.html'), '<!doctype html><html><body><script src="/aurora-loading.js?v=2"></script></body></html>')

  async function release(content) {
    await writeFile(script, content)
    await build({root, configFile: false, envDir: false, logLevel: 'silent', plugins: [startupScreenVersion(script)]})
    const html = await readFile(join(root, 'dist', 'index.html'), 'utf8')
    const copiedScript = await readFile(join(root, 'dist', 'aurora-loading.js'))
    assert.equal(copiedScript.toString(), content)
    const version = createHash('sha256').update(copiedScript).digest('hex').slice(0, 12)
    assert.ok(html.includes(`src="/aurora-loading.js?v=${version}"`))
    assert.doesNotMatch(html, /type="module"/, 'startup stays independent of the application module graph')
    return version
  }

  const first = await release('window.startupDesign = "first";')
  const unchanged = await release('window.startupDesign = "first";')
  const updated = await release('window.startupDesign = "updated";')
  assert.equal(first, unchanged)
  assert.notEqual(first, updated)
})
