import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { releaseGoModule } from './release-go-module.use-case.mjs'

const US = '\u{1F}'
const RS = '\u{1E}'

/** A git that knows the tags and the log it is asked for, and records every command. */
function fakeGit ({ tags = [], log = [] }) {
  const calls = []
  const git = args => {
    calls.push(args)
    if (args[0] === 'tag' && args[1] === '--list') return tags.join('\n')
    if (args[0] === 'log') return log.map(([subject, body = '']) => `${subject}${US}${body}${RS}\n`).join('')

    return ''
  }

  return { git, calls }
}

describe('releaseGoModule', () => {
  it('tags and pushes the next version when a fix touched the module since the last tag', () => {
    const { git, calls } = fakeGit({ tags: ['packages/tty-go/v0.0.2', 'tty@0.0.5'], log: [['fix(session): stop leaking a goroutine'], ['docs: readme']] })

    assert.deepEqual(releaseGoModule({ directory: 'packages/tty-go', git }), { tag: 'packages/tty-go/v0.0.3', bump: 'patch' })
    assert.deepEqual(calls.at(-2), ['tag', 'packages/tty-go/v0.0.3'])
    assert.deepEqual(calls.at(-1), ['push', 'origin', 'packages/tty-go/v0.0.3'])
  })

  it('asks git only for commits since the latest tag that touched the module directory', () => {
    const { git, calls } = fakeGit({ tags: ['packages/tty-go/v0.0.2', 'packages/tty-go/v0.0.10'], log: [] })

    releaseGoModule({ directory: 'packages/tty-go', git })

    const logCall = calls.find(args => args[0] === 'log')
    assert.equal(logCall[1], 'packages/tty-go/v0.0.10..HEAD')
    assert.deepEqual(logCall.slice(-2), ['--', 'packages/tty-go'])
  })

  it('tags v0.0.1 the first time, from the whole history of the directory', () => {
    const { git, calls } = fakeGit({ tags: [], log: [['feat: the adapter']] })

    assert.deepEqual(releaseGoModule({ directory: 'packages/tty-go', git }), { tag: 'packages/tty-go/v0.0.1', bump: 'first' })
    assert.equal(calls.find(args => args[0] === 'log').some(argument => argument.endsWith('..HEAD')), false)
  })

  it('creates nothing when the commits do not release', () => {
    const { git, calls } = fakeGit({ tags: ['packages/tty-go/v0.0.2'], log: [['docs: x'], ['chore: y']] })
    const lines = []

    assert.equal(releaseGoModule({ directory: 'packages/tty-go', git, log: line => { lines.push(line) } }), undefined)
    assert.equal(calls.some(args => args[0] === 'push' || (args[0] === 'tag' && args[1] !== '--list')), false)
    assert.match(lines[0], /nothing to release \(2 commit\(s\)/)
  })

  it('reads a breaking change from the commit body', () => {
    const { git } = fakeGit({ tags: ['packages/tty-go/v0.3.0'], log: [['refactor: the handler', 'BREAKING CHANGE: Handler takes options']] })

    assert.deepEqual(releaseGoModule({ directory: 'packages/tty-go', git }), { tag: 'packages/tty-go/v0.4.0', bump: 'minor' })
  })

  it('says what it would do in a dry run, and does it not', () => {
    const { git, calls } = fakeGit({ tags: ['packages/tty-go/v0.0.2'], log: [['feat: x']] })
    const lines = []

    assert.deepEqual(releaseGoModule({ directory: 'packages/tty-go', git, dryRun: true, log: line => { lines.push(line) } }), { tag: 'packages/tty-go/v0.0.3', bump: 'patch' })
    assert.match(lines[0], /would tag packages\/tty-go\/v0\.0\.3/)
    assert.equal(calls.some(args => args[0] === 'push'), false)
  })
})
