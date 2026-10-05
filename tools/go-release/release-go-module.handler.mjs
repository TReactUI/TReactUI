#!/usr/bin/env node
// Usage: node tools/go-release/release-go-module.handler.mjs --module packages/tty-go [--dry-run]
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { parseArgs } from 'node:util'
import { releaseGoModule } from './release-go-module.use-case.mjs'

const { values } = parseArgs({ options: { 'module': { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } })
if (values.module === undefined) {
  console.error('release-go-module: --module <directory> is required, as in --module packages/tty-go')
  process.exit(2)
}

try {
  releaseGoModule({
    directory: values.module,
    dryRun:    values['dry-run'],
    git:       args => execFileSync('git', args, { encoding: 'utf8' }),
    log:       line => console.log(line),
  })
} catch (error) {
  console.error(`release-go-module: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
