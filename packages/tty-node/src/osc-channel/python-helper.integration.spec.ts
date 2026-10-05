import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { parseServerMessage } from '@treactui/protocol'
import { createAppMessageExtractor } from './app-message-extractor.store'
import { announce } from './publish-app-message.client'

/**
 * The Python helper in integrations/python is a second implementation of the side
 * channel. This runs it for real and feeds what it writes through the adapter's own
 * extractor and the protocol parser, so the two languages cannot drift apart.
 */
const PYTHON_FOLDER = join(__dirname, '..', '..', '..', '..', 'integrations', 'python')

function findPython (): string | undefined {
  return ['python3', 'python', 'py'].find(candidate => {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' })

    return probe.status === 0 && `${probe.stdout}${probe.stderr}`.startsWith('Python 3')
  })
}

const python = findPython()
const describeWithPython = python === undefined ? describe.skip : describe

function runPython (args: string[], env: NodeJS.ProcessEnv): { stdout: string, status: number | null } {
  const result = spawnSync(python as string, args, {
    cwd:      PYTHON_FOLDER,
    encoding: 'utf8',
    env:      { ...process.env, PYTHONIOENCODING: 'utf8', PYTHONPATH: PYTHON_FOLDER, TREACT_TTY: undefined, ...env },
  })

  // Python writes text-mode newlines as CRLF on Windows; the frames themselves have none.
  return { stdout: result.stdout.replaceAll('\r\n', '\n'), status: result.status }
}

const PROGRAM = String.raw`
import sys
from treactui_tty import announce, publish_event, publish_snapshot
sys.stdout.write("before\n")
announce("Saved \u65e5\u672c\u8a9e", "assertive")
publish_snapshot({"title": "Queue", "nodes": [{"role": "listbox", "label": "Queue", "children": [{"role": "option", "label": "Song A", "selected": True}]}]})
publish_event("open-file", {"accept": ".txt"})
sys.stdout.write("after\n")
`

describeWithPython('the Python helper', () => {
  it('writes frames that the adapter extracts and the protocol parser accepts, leaving the text alone', () => {
    const { stdout, status } = runPython(['-c', PROGRAM], { TREACT_TTY: '1' })
    const { output, messages } = createAppMessageExtractor().push(stdout)
    const parsed = messages.map(raw => parseServerMessage(raw))

    expect(status).toBe(0)
    expect(output).toBe('before\nafter\n')
    expect(parsed.every(result => result.ok)).toBe(true)
    expect(parsed.map(result => (result.ok ? result.message : undefined))).toEqual([
      { type: 'announce', text: 'Saved 日本語', politeness: 'assertive' },
      { type: 'a11y-snapshot', snapshot: { title: 'Queue', nodes: [{ role: 'listbox', label: 'Queue', children: [{ role: 'option', label: 'Song A', selected: true }] }] } },
      { type: 'event', name: 'open-file', payload: { accept: '.txt' } },
    ])
  })

  it('writes byte for byte what the TypeScript helper writes for the same message', () => {
    let written = ''
    announce('Saved', 'polite', { write: text => { written += text } }, { TREACT_TTY: '1' })

    const { stdout } = runPython(['-c', 'from treactui_tty import announce; announce("Saved")'], { TREACT_TTY: '1' })

    expect(stdout).toBe(written)
  })

  it('writes nothing outside the adapter', () => {
    const { stdout, status } = runPython(['-c', PROGRAM], {})

    expect(status).toBe(0)
    expect(stdout).toBe('before\nafter\n')
  })

  it('passes its own unit tests', () => {
    const result = spawnSync(python as string, ['-m', 'unittest', 'discover', '-s', '.', '-t', '.', '-p', 'test_*.py'], {
      cwd:      PYTHON_FOLDER,
      encoding: 'utf8',
      env:      { ...process.env, PYTHONIOENCODING: 'utf8' },
    })

    expect(result.stderr).toMatch(/OK\s*$/)
    expect(result.status).toBe(0)
  })
})
