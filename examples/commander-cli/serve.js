// Serves the CLI to @treactui/tty at ws://localhost:8080/term, with a launcher: the browser shows
// a form built from the program's commands, arguments and options, then runs the one chosen.
import { fileURLToPath } from 'node:url'
import { serveCommander } from '@treactui/tty-node'
import { createProgram } from './program.js'

const program = createProgram()
const server = await serveCommander({
  program,
  command:        process.execPath,
  args:           [fileURLToPath(new URL('cli.js', import.meta.url))],
  port:           8080,
  allowedOrigins: ['localhost:4200'],
})

console.log(`serving the "${program.name()}" launcher at ws://localhost:${server.port}/term`)
