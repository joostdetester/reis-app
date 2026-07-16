// Genereert public/version.json vóór elke build, zodat de gedeployde app een
// statisch, opvraagbaar versiebestand heeft ({BASE_URL}/version.json). Het
// reis-app-taf testframework leest dit bestand uit om te loggen tegen welke
// app-versie een testrun heeft gedraaid (zie ai/ in dat project).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function resolveCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

const version = {
  version: pkg.version,
  commit: resolveCommit(),
  builtAt: new Date().toISOString(),
}

writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify(version, null, 2) + '\n')
console.log(`public/version.json geschreven: ${version.version} (${version.commit.slice(0, 7)})`)
