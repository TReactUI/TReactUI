import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bumpVersion, latestVersion, nextTag, parseVersionTag, releaseBump } from './next-go-version.algorithm.mjs'

const PREFIX = 'packages/tty-go/'
const commit = (subject, body) => ({ subject, body })

describe('parseVersionTag', () => {
  it('reads a tag of this module', () => {
    assert.deepEqual(parseVersionTag('packages/tty-go/v1.20.3', PREFIX), [1, 20, 3])
  })

  it('ignores other modules, the npm tags and anything that is not a plain version', () => {
    for (const tag of ['apps/demo/v1.0.0', 'tty@0.0.5', '@treactui/tty-node@0.0.5', 'packages/tty-go/v1.0', 'packages/tty-go/v1.0.0-rc.1', 'packages/tty-go/1.0.0', 'v1.0.0']) {
      assert.equal(parseVersionTag(tag, PREFIX), undefined, tag)
    }
  })
})

describe('latestVersion', () => {
  it('compares numbers, not text', () => {
    assert.deepEqual(latestVersion(['packages/tty-go/v0.0.9', 'packages/tty-go/v0.0.10', 'packages/tty-go/v0.0.2'], PREFIX), [0, 0, 10])
  })

  it('is undefined when the module has no tag', () => {
    assert.equal(latestVersion(['tty@0.0.5', 'packages/other/v1.0.0'], PREFIX), undefined)
  })
})

describe('releaseBump', () => {
  it('releases nothing for commits that are not features, fixes or breaking', () => {
    for (const major of [0, 1]) {
      assert.equal(releaseBump([commit('docs: x'), commit('chore(deps): y'), commit('test: z'), commit('refactor: w'), commit('ci: v'), commit('not conventional')], major), undefined)
    }
  })

  it('before 1.0.0, a feature and a fix are both a patch, and a breaking change is a minor', () => {
    assert.equal(releaseBump([commit('feat: x')], 0), 'patch')
    assert.equal(releaseBump([commit('fix(session): x')], 0), 'patch')
    assert.equal(releaseBump([commit('feat!: x')], 0), 'minor')
    assert.equal(releaseBump([commit('fix: x', 'details\n\nBREAKING CHANGE: the handler signature changed')], 0), 'minor')
  })

  it('from 1.0.0, a feature is a minor, a fix a patch, and a breaking change a major', () => {
    assert.equal(releaseBump([commit('fix: x')], 1), 'patch')
    assert.equal(releaseBump([commit('feat: x')], 1), 'minor')
    assert.equal(releaseBump([commit('fix: x'), commit('feat: y')], 1), 'minor')
    assert.equal(releaseBump([commit('feat(api)!: x'), commit('feat: y')], 2), 'major')
  })

  it('treats perf as a fix and takes the highest of several commits', () => {
    assert.equal(releaseBump([commit('perf: x')], 1), 'patch')
    assert.equal(releaseBump([commit('docs: a'), commit('fix: b'), commit('feat!: c')], 0), 'minor')
  })
})

describe('bumpVersion', () => {
  it('resets what is below the part that moved', () => {
    assert.deepEqual(bumpVersion([1, 2, 3], 'patch'), [1, 2, 4])
    assert.deepEqual(bumpVersion([1, 2, 3], 'minor'), [1, 3, 0])
    assert.deepEqual(bumpVersion([1, 2, 3], 'major'), [2, 0, 0])
  })
})

describe('nextTag', () => {
  it('releases v0.0.1 the first time, whatever the commits say', () => {
    assert.deepEqual(nextTag({ tags: ['tty@0.0.5'], commits: [commit('docs: x')], prefix: PREFIX }), { tag: 'packages/tty-go/v0.0.1', bump: 'first' })
  })

  it('has nothing to release the first time when no commit touched the module', () => {
    assert.equal(nextTag({ tags: [], commits: [], prefix: PREFIX }), undefined)
  })

  it('bumps from the latest tag', () => {
    assert.deepEqual(nextTag({ tags: ['packages/tty-go/v0.0.1', 'packages/tty-go/v0.0.3'], commits: [commit('feat: x')], prefix: PREFIX }), { tag: 'packages/tty-go/v0.0.4', bump: 'patch' })
  })

  it('releases nothing when the commits since the last tag do not release', () => {
    assert.equal(nextTag({ tags: ['packages/tty-go/v0.0.3'], commits: [commit('docs: x')], prefix: PREFIX }), undefined)
    assert.equal(nextTag({ tags: ['packages/tty-go/v0.0.3'], commits: [], prefix: PREFIX }), undefined)
  })
})
