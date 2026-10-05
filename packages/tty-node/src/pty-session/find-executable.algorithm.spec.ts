import { findExecutable } from './find-executable.algorithm'

/** A Windows file system: names match whatever their case. */
const present = (...files: string[]) => (filePath: string): boolean => files.some(file => file.toLowerCase() === filePath.toLowerCase())

describe('findExecutable', () => {
  const env = { Path: String.raw`C:\Windows;"C:\Program Files\Python"`, PATHEXT: '.COM;.EXE;.BAT;.CMD' }

  it('finds a bare command through PATH and PATHEXT on Windows', () => {
    expect(findExecutable('python', { platform: 'win32', env, exists: present(String.raw`C:\Program Files\Python\python.exe`) }))
      .toBe(String.raw`C:\Program Files\Python\python.EXE`)
  })

  it('takes the first directory, and the first extension, that has the file', () => {
    const exists = present(String.raw`C:\Windows\tool.cmd`, String.raw`C:\Windows\tool.exe`, String.raw`C:\Program Files\Python\tool.exe`)

    expect(findExecutable('tool', { platform: 'win32', env, exists })).toBe(String.raw`C:\Windows\tool.EXE`)
  })

  it('reads PATH whatever its case', () => {
    expect(findExecutable('x', { platform: 'win32', env: { PATH: String.raw`C:\bin` }, exists: present(String.raw`C:\bin\x.exe`) })).toBe(String.raw`C:\bin\x.EXE`)
  })

  it('does not add an extension to a command that already has one', () => {
    const exists = present(String.raw`C:\Windows\npm.cmd`, String.raw`C:\Windows\npm.cmd.exe`)

    expect(findExecutable('npm.cmd', { platform: 'win32', env, exists })).toBe(String.raw`C:\Windows\npm.cmd`)
  })

  it('falls back to the usual extensions when PATHEXT is missing', () => {
    expect(findExecutable('x', { platform: 'win32', env: { Path: String.raw`C:\bin` }, exists: present(String.raw`C:\bin\x.EXE`) })).toBe(String.raw`C:\bin\x.EXE`)
  })

  it.each([String.raw`C:\tools\python.exe`, String.raw`.\python`, 'bin/python', '/usr/bin/python'])('leaves %s alone, it already names a location', command => {
    expect(findExecutable(command, { platform: 'win32', env, exists: () => true })).toBe(command)
  })

  it('returns the command as given when nothing is found, so the spawn reports it', () => {
    expect(findExecutable('nope', { platform: 'win32', env, exists: () => false })).toBe('nope')
  })

  it('does nothing outside Windows, where the system searches PATH', () => {
    expect(findExecutable('python', { platform: 'linux', env: { PATH: '/usr/bin' }, exists: () => true })).toBe('python')
  })
})
