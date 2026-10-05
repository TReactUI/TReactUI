import { win32 } from 'node:path'

export interface FindExecutableContext {
  platform: NodeJS.Platform
  env:      NodeJS.ProcessEnv
  /** Whether a file exists; injected so the search can be tested on any system. */
  exists:   (filePath: string) => boolean
}

const DEFAULT_PATHEXT = '.COM;.EXE;.BAT;.CMD'

/** Reads a variable the way Windows does, ignoring case (`Path`, `PATH`). */
const readVariable = (env: NodeJS.ProcessEnv, name: string): string | undefined => {
  const key = Object.keys(env).find(candidate => candidate.toLowerCase() === name.toLowerCase())

  return key === undefined ? undefined : env[key]
}

/**
 * The file a bare command name stands for. Windows pseudo-terminals (ConPTY) do not
 * search `PATH` or try `PATHEXT` the way a shell does, so `python` must become
 * `C:\\Python\\python.exe`. Elsewhere the system does the search, and a command that
 * already names a location is left alone everywhere. When nothing is found the
 * command is returned as given, so the spawn reports the failure.
 */
export function findExecutable (command: string, context: FindExecutableContext): string {
  if (context.platform !== 'win32' || /[/\\]/.test(command)) return command

  const extensions = (readVariable(context.env, 'PATHEXT') ?? DEFAULT_PATHEXT).split(';').filter(extension => extension !== '')
  const hasKnownExtension = extensions.some(extension => command.toLowerCase().endsWith(extension.toLowerCase()))
  const names = hasKnownExtension ? [command] : extensions.map(extension => `${command}${extension}`)
  const directories = (readVariable(context.env, 'PATH') ?? '').split(';').map(directory => directory.replaceAll('"', '').trim()).filter(directory => directory !== '')

  for (const directory of directories) {
    for (const name of names) {
      const candidate = win32.join(directory, name)
      if (context.exists(candidate)) return candidate
    }
  }

  return command
}
