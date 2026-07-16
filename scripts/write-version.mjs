// Genereert public/version.json vóór elke build, zodat de gedeployde app een
// statisch, opvraagbaar versiebestand heeft ({BASE_URL}/version.json). Het
// reis-app-taf testframework leest dit bestand uit om te loggen tegen welke
// app-versie een testrun heeft gedraaid (zie ai/ in dat project).
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

function resolveCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// CalVer with a UTC time component, not package.json's static "1.0.0" - this
// app can deploy more than once a day, and a date-only version would make
// every same-day deploy look identical in the Allure Environment widget.
function formatVersion(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
}

const builtAt = new Date()
const version = {
  version: formatVersion(builtAt),
  commit: resolveCommit(),
  builtAt: builtAt.toISOString(),
}

writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify(version, null, 2) + '\n')
console.log(`public/version.json geschreven: ${version.version} (${version.commit.slice(0, 7)})`)
