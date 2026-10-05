// Serves the CLI to @trectui/tty at ws://localhost:8080/term.
// Usage: node serve.js [command and arguments...]   (default: setup)
import { fileURLToPath } from 'node:url'
import { serveCommand } from '@trectui/tty-node'

const cli = fileURLToPath(new URL('cli.js', import.meta.url))
const args = process.argv.slice(2)

const server = await serveCommand({
  command: process.execPath,
  args: [cli, ...(args.length > 0 ? args : ['setup'])],
  port: 8080,
  allowedOrigins: ['localhost:4200'],
})

console.log(`serving "tasks ${args.join(' ') || 'setup'}" at ws://localhost:${server.port}/term`)
