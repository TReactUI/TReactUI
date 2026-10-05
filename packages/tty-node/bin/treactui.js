#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { runCli } from '../dist/index.esm.js'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const exitCode = await runCli(process.argv.slice(2), {
  version,
  write:       text => process.stdout.write(text),
  writeError:  text => process.stderr.write(text),
  waitForStop: () => new Promise(resolve => {
    process.once('SIGINT', resolve)
    process.once('SIGTERM', resolve)
  }),
})

process.exit(exitCode)
