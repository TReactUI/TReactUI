import type { ServeCommandOptions } from '../serve-command'
import type { CliCommand } from './cli-command.contract'

const MAX_PORT = 65_535

const error = (message: string): CliCommand => ({ kind: 'error', message })

type ServerOptions = Pick<ServeCommandOptions, 'cwd' | 'host' | 'path' | 'port'> & { allowedOrigins: string[] }

/** Applies one `--option value` pair to `options`; returns what is wrong with it, if anything. */
function applyOption (options: ServerOptions, flag: string, value: string): string | undefined {
  switch (flag) {
    case '--port': {
      if (!/^\d+$/.test(value) || Number(value) > MAX_PORT) return `--port must be a whole number from 0 to ${MAX_PORT}, got "${value}"`
      options.port = Number(value)

      return undefined
    }
    case '--host': {
      options.host = value

      return undefined
    }
    case '--path': {
      if (!value.startsWith('/')) return `--path must start with "/", got "${value}"`
      options.path = value

      return undefined
    }
    case '--origin': {
      options.allowedOrigins.push(value)

      return undefined
    }
    case '--cwd': {
      options.cwd = value

      return undefined
    }
    default: {
      return `unknown option "${flag}"`
    }
  }
}

const HELP_WORDS = new Set(['-h', '--help', 'help'])
const VERSION_WORDS = new Set(['-v', '--version'])

/** Turns the command line (without `node` and the script) into what is asked for. */
export function parseCliArguments (argv: readonly string[]): CliCommand {
  const first = argv[0]
  if (first === undefined || HELP_WORDS.has(first)) return { kind: 'help' }
  if (VERSION_WORDS.has(first)) return { kind: 'version' }
  if (first !== 'serve') return error(`unknown command "${first}"; try: treactui serve -- <program>`)

  const options: ServerOptions = { allowedOrigins: [] }

  let index = 1
  // The first word that is not an option starts the program, and so does `--`.
  while (index < argv.length && argv[index] !== '--' && argv[index]?.startsWith('-')) {
    const flag = argv[index]
    if (HELP_WORDS.has(flag)) return { kind: 'help' }

    const value = argv[index + 1]
    if (value === undefined || value === '--') return error(`${flag} needs a value`)

    const problem = applyOption(options, flag, value)
    if (problem !== undefined) return error(problem)
    index += 2
  }

  if (argv[index] === '--') index++
  const [command, ...args] = argv.slice(index)
  if (command === undefined) return error('no program to serve; put it after --, as in: treactui serve -- python app.py')

  return { kind: 'serve', options: { command, args, ...options } }
}
