import { latestVersion, nextTag } from './next-go-version.algorithm.mjs'

const FIELD = '\u{1F}'
const RECORD = '\u{1E}'

/**
 * Tags a Go module for release when the commits since its last tag call for one.
 *
 * `git` runs one git command and returns its output; it is a parameter so that a test can supply a repository
 * without having one. Only commits that touched the module's directory count.
 *
 * @param {{ directory: string, git: (args: string[]) => string, dryRun?: boolean, log?: (line: string) => void }} options
 * @returns {{ tag: string, bump: string } | undefined} what was tagged (or would be, in a dry run)
 */
export function releaseGoModule ({ directory, git, dryRun = false, log = () => {} }) {
  const prefix = `${directory}/`
  const tags = git(['tag', '--list', `${prefix}v*`]).split('\n').map(tag => tag.trim()).filter(tag => tag !== '')
  const latest = latestVersion(tags, prefix)
  const range = latest === undefined ? [] : [`${prefix}v${latest.join('.')}..HEAD`]

  const commits = git(['log', ...range, `--format=%s${FIELD}%b${RECORD}`, '--', directory])
    .split(RECORD)
    .map(record => record.replace(/^\n/, ''))
    .filter(record => record.trim() !== '')
    .map(record => {
      const [subject, body] = record.split(FIELD)

      return { subject: subject.trim(), body: (body ?? '').trim() }
    })

  const next = nextTag({ tags, commits, prefix })
  if (next === undefined) {
    log(`${directory}: nothing to release (${commits.length} commit(s) since ${latest === undefined ? 'the start' : `${prefix}v${latest.join('.')}`}, none of them a feature, a fix or a breaking change).`)

    return
  }

  log(`${directory}: ${dryRun ? 'would tag' : 'tagging'} ${next.tag} (${next.bump}).`)
  if (!dryRun) {
    git(['tag', next.tag])
    git(['push', 'origin', next.tag])
  }

  return next
}
