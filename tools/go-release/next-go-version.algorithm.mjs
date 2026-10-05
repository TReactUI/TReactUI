/**
 * Decides the next version of a Go module released by git tag, from the tags it already has and the
 * conventional commits that touched it since. Pure: no git, no clock.
 *
 * A Go module in a sub-directory is versioned by tags named `<directory>/vX.Y.Z`, so that is the only
 * state there is. The rules match how the npm packages are versioned while the major version is 0:
 * a `feat` or a `fix` bumps the patch, and a breaking change bumps the minor. From 1.0.0 on they are the
 * usual ones: breaking is major, `feat` is minor, `fix` is patch. Everything else (docs, chore, test, ci,
 * refactor, style, build) releases nothing.
 */

/** @typedef {{ subject: string, body?: string }} Commit */
/** @typedef {'major' | 'minor' | 'patch'} Bump */

const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/
const CONVENTIONAL_SUBJECT = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<breaking>!)?: /

/** `packages/tty-go/v1.2.3` with the prefix `packages/tty-go/` is `[1, 2, 3]`; anything else is `undefined`. */
export function parseVersionTag (tag, prefix) {
  if (!tag.startsWith(prefix)) return
  const match = SEMVER_TAG.exec(tag.slice(prefix.length))

  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3])]
}

const compareVersions = (left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2]

/** The highest version among the tags that belong to this module, or `undefined` if it has none. */
export function latestVersion (tags, prefix) {
  const versions = tags.map(tag => parseVersionTag(tag, prefix)).filter(version => version !== undefined)

  return versions.length === 0 ? undefined : versions.sort(compareVersions).at(-1)
}

/** What one commit asks for, before the pre-1.0 adjustment: a bump, or `undefined` for a commit that does not release. */
function bumpOf (commit) {
  const match = CONVENTIONAL_SUBJECT.exec(commit.subject)
  if (match === null) return
  if (match.groups.breaking === '!' || /^BREAKING[ -]CHANGE:/m.test(commit.body ?? '')) return 'major'
  if (match.groups.type === 'feat') return 'minor'
  if (match.groups.type === 'fix' || match.groups.type === 'perf') return 'patch'

  return
}

const ORDER = ['patch', 'minor', 'major']

/**
 * The bump the commits call for, given the current major version, or `undefined` when none of them releases.
 * @param {Commit[]} commits
 * @param {number} major
 * @returns {Bump | undefined}
 */
export function releaseBump (commits, major) {
  const asked = commits.map(commit => bumpOf(commit)).filter(bump => bump !== undefined)
  if (asked.length === 0) return
  const highest = asked.reduce((best, bump) => (ORDER.indexOf(bump) > ORDER.indexOf(best) ? bump : best))
  if (major > 0) return highest

  // Before 1.0.0 a feature is a patch and a breaking change is a minor.
  return highest === 'major' ? 'minor' : 'patch'
}

/** @param {number[]} version @param {Bump} bump */
export function bumpVersion (version, bump) {
  const [major, minor, patch] = version
  if (bump === 'major') return [major + 1, 0, 0]
  if (bump === 'minor') return [major, minor + 1, 0]

  return [major, minor, patch + 1]
}

/**
 * The tag to create, or `undefined` for none.
 *
 * A module with no tag yet is released as `v0.0.1` as soon as it has any commit, whatever the commit says,
 * because there is nothing to compare with.
 *
 * @param {{ tags: string[], commits: Commit[], prefix: string }} input `commits` are the ones since the latest
 *   tag that touched the module (all of them when there is no tag).
 * @returns {{ tag: string, bump: Bump | 'first' } | undefined}
 */
export function nextTag ({ tags, commits, prefix }) {
  const current = latestVersion(tags, prefix)
  if (current === undefined) return commits.length === 0 ? undefined : { tag: `${prefix}v0.0.1`, bump: 'first' }

  const bump = releaseBump(commits, current[0])
  if (bump === undefined) return

  return { tag: `${prefix}v${bumpVersion(current, bump).join('.')}`, bump }
}
