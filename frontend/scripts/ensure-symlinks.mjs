#!/usr/bin/env node
/**
 * ensure-symlinks — cross-platform repair for Git symlinks on Windows.
 *
 * The public repo symlinks several source files out of the `private/` submodule
 * into `frontend/src` (see vite.config.ts → `preserveSymlinks: true`). On
 * macOS/Linux these are real symlinks and this script is a no-op.
 *
 * On Windows, Git only creates real symlinks when Developer Mode is on (or the
 * shell is elevated) AND `core.symlinks=true`. Otherwise Git checks each symlink
 * out as a PLAIN-TEXT stub whose contents are the link target path, e.g.
 *     ../../../private/frontend/src/pages/RenewPage.tsx
 * which Vite/tsc then try to parse as TypeScript → "Unexpected token".
 *
 * This script restores every such file:
 *   • real symlink when the OS allows it (also clears any stale skip-worktree bit)
 *   • otherwise a content COPY from the submodule as a fallback, marked
 *     --skip-worktree so the copy stays out of `git status` / commits.
 *
 * It only touches files under this frontend package, and prints the reason +
 * resolution steps for anything it cannot fully fix.
 */

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  rmSync,
  symlinkSync,
  copyFileSync,
  readlinkSync,
} from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const TAG = '[ensure-symlinks]'
const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// All git invocations run from the repo root so that `git ls-files` and
// `git cat-file :<path>` agree on repo-root-relative paths. It starts at the
// frontend dir (always inside the repo) and is pinned to the real root below.
let gitCwd = frontendRoot
function git(args, opts = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd: gitCwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).toString()
}

function setSkipWorktree(rel, on) {
  try {
    git(['update-index', on ? '--skip-worktree' : '--no-skip-worktree', '--', rel])
  } catch {
    /* best-effort: index bit is a convenience, not required for the build */
  }
}

let repoRoot
try {
  repoRoot = git(['rev-parse', '--show-toplevel']).trim()
} catch {
  console.warn(`${TAG} not a git repository; skipping`)
  process.exit(0)
}
gitCwd = repoRoot

// Every path Git records as a symlink (mode 120000), relative to repo root.
let entries
try {
  entries = git(['ls-files', '-s'])
    .split('\n')
    .filter((line) => line.startsWith('120000'))
    .map((line) => line.split('\t').slice(1).join('\t'))
    .filter(Boolean)
} catch (err) {
  console.warn(`${TAG} could not list files (${err.message}); skipping`)
  process.exit(0)
}

const fixedSymlink = []
const copied = []
const missingTarget = []
const failed = []

for (const rel of entries) {
  const linkAbs = resolve(repoRoot, rel)

  // Only manage symlinks inside this frontend package.
  if (relative(frontendRoot, linkAbs).startsWith('..')) continue

  // The link target is the STAGED blob content — the source of truth even when
  // the working-tree file is currently a text stub or an earlier copy.
  let targetRel
  try {
    targetRel = git(['cat-file', '-p', `:${rel}`]).replace(/\r?\n/g, '').trim()
  } catch {
    continue // e.g. nested submodule path; nothing safe to do
  }
  if (!targetRel) continue

  const targetAbs = resolve(dirname(linkAbs), targetRel)

  let stat = null
  try {
    stat = lstatSync(linkAbs)
  } catch {
    /* missing on disk — will be (re)created below */
  }

  // Already a correct symlink → leave it, clear any stale skip-worktree bit.
  if (stat && stat.isSymbolicLink()) {
    let current = ''
    try {
      current = readlinkSync(linkAbs).replace(/\\/g, '/')
    } catch {
      /* unreadable link — fall through and recreate */
    }
    if (current === targetRel) {
      setSkipWorktree(rel, false)
      continue
    }
  }

  // Target must exist (private submodule must be checked out).
  if (!existsSync(targetAbs)) {
    missingTarget.push({ rel, targetRel })
    continue
  }

  if (stat) {
    try {
      rmSync(linkAbs, { force: true })
    } catch (err) {
      failed.push({ rel, error: `could not remove stub: ${err.message}` })
      continue
    }
  }

  // Prefer a real symlink; fall back to a copy when the OS forbids it.
  try {
    symlinkSync(targetRel, linkAbs, 'file')
    setSkipWorktree(rel, false)
    fixedSymlink.push(rel)
  } catch {
    try {
      copyFileSync(targetAbs, linkAbs)
      setSkipWorktree(rel, true)
      copied.push(rel)
    } catch (copyErr) {
      failed.push({ rel, error: copyErr.message })
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`

if (fixedSymlink.length) {
  console.log(`${TAG} created ${fixedSymlink.length} real symlink(s).`)
}

if (copied.length) {
  console.warn(`
${yellow(`⚠  ${TAG} copied ${copied.length} file(s) as a fallback (these are NOT symlinks)`)}

  WHY THIS HAPPENED
    This repo symlinks source files from the private/ submodule into frontend/src.
    Windows could not create real symlinks because Developer Mode is off and this
    shell is not elevated, so Git checked them out as plain-text stubs (which
    breaks Vite/tsc). They have been copied from the submodule so dev works now.

  CAVEAT — these are COPIES
    Edits in private/ won't show up until you re-run this script, and the copies
    are marked --skip-worktree so they stay out of \`git status\` and commits.
    Re-run the dev/build (or: node scripts/ensure-symlinks.mjs) after pulling
    private/ changes to refresh them.

  MAKE IT PERMANENT (one-time, recommended)
    1. Enable Developer Mode:
         Settings ▸ System ▸ For developers ▸ Developer Mode = On
       (or run step 2 from an Administrator terminal)
    2. git config core.symlinks true
    3. Re-run the dev/build — real symlinks are created automatically and the
       skip-worktree bits are cleared.

  Copied:
${copied.map((f) => `    - ${f}`).join('\n')}
`)
}

if (missingTarget.length) {
  console.error(`
${red(`✖  ${TAG} ${missingTarget.length} symlink target(s) are missing`)}

  WHY THIS HAPPENED
    The private/ submodule does not appear to be checked out, so there is nothing
    to link or copy to.

  HOW TO RESOLVE
    git submodule update --init --recursive
    then re-run the dev/build.

  Missing:
${missingTarget.map((m) => `    - ${m.rel}  ->  ${m.targetRel}`).join('\n')}
`)
  process.exitCode = 1
}

if (failed.length) {
  console.error(`
${red(`✖  ${TAG} failed to restore ${failed.length} file(s)`)}
${failed.map((f) => `    - ${f.rel}: ${f.error}`).join('\n')}
`)
  process.exitCode = 1
}
