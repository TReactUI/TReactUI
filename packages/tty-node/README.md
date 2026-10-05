# @treactui/tty-node

Serves a Node program to [`@treactui/tty`](../tty) over a WebSocket: each browser gets its own copy
of the program in a pseudo-terminal ([node-pty](https://github.com/microsoft/node-pty)), so
anything that writes to a terminal works: commander CLIs, prompt libraries
([@clack/prompts](https://github.com/bombshell-dev/clack), inquirer), Ink, blessed.

```js
import { serveCommand } from '@treactui/tty-node'

await serveCommand({ command: 'node', args: ['cli.js', 'setup'], allowedOrigins: ['localhost:4200'] })
// ws://127.0.0.1:8080/term
```

## Ink, in-process

Ink accepts custom streams, so an Ink app can be served without a PTY or a native module. Pass the
adapter's streams to your own `render`:

```js
import { serveInk } from '@treactui/tty-node'
import { render } from 'ink'

await serveInk({
  render: ({ stdin, stdout, announce, publishSnapshot }) =>
    render(<App announce={announce} />, { stdin, stdout, patchConsole: false, exitOnCtrlC: false }),
})
```

Each browser gets its own instance, in this process. `announce`, `publishSnapshot` and `emitEvent`
talk to the page directly, so no escape-sequence channel is needed. The adapter does not depend on
Ink; it only needs `unmount()` and `waitUntilExit()` from what `render` returns.

| | `serveCommand` (PTY) | `serveInk` (in-process) |
|---|---|---|
| Runs | any program, in a child process | an Ink app, in this process |
| Native module | node-pty (prebuilt for Windows, macOS, Linux) | none |
| Isolation | one OS process per browser | one React tree per browser; a crash is caught, a blocked event loop is shared |
| Speaking to the page | the OSC channel (`announce`, `publishSnapshot`) | the session context |

## A commander CLI, with a launcher

`serveCommander` reads a commander program (commands, arguments, options, choices, defaults, required)
and offers it to the page as an accessible form (see [`@treactui/tty`](../tty)). The browser picks a command
and fills it in; the command runs in a PTY, and when it ends the page can pick another.

```js
import { serveCommander } from '@treactui/tty-node'
import { program } from './program.js' // defines the commands, does not parse

await serveCommander({ program, command: process.execPath, args: ['cli.js'], allowedOrigins: ['localhost:4200'] })
// runs: node cli.js <command> <arguments>
```

The program is read for its metadata only (any commander 11+ `Command` fits; this package does not
depend on commander). A nested command is offered by its path, `remote add`.

## Security

The endpoint runs programs, so it is closed by default:

- it listens on `127.0.0.1` only (`host` opts in to more);
- a page may connect only if it was served from the same host, or is listed in `allowedOrigins`
  (this stops a foreign web page driving your local terminal through the visitor's browser);
- the program is fixed by the server. With `serveCommander` the browser chooses among the commands the
  server catalogued and supplies their arguments, which reach the program as an argument list (never through
  a shell, bounded in number, size and free of NUL). Treat that as the CLI's own exposed surface: anything a
  command can do with arguments, a visitor to the page can ask it to do.

## Speaking to the page from the program

A program in a PTY is a separate process, so it publishes through its own output: a private OSC
sequence (`ESC ] 7770 ; <json> BEL`) that the adapter strips and turns into protocol messages. From
Node:

```js
import { announce, publishSnapshot } from '@treactui/tty-node'

announce('Download finished')                         // read aloud by a screen reader
publishSnapshot({ title: 'Tasks', nodes: [/* ARIA */] }) // see @treactui/protocol
```

Both do nothing outside the adapter (the adapter sets `TREACT_TTY=1`), so the program still works in
a real terminal. Any language can write the sequence itself.

When the browser first reports its size the program starts at that size; if it never does, the program
starts after 500 ms at 80×24. When the program exits the page receives an `event` named `exit` with
its `exitCode`.

## How this package is organised

```
src/
  index.ts             the public API
  session-transport/   the Transport contract: text frames to and from one browser
  osc-channel/         the program-to-adapter side channel: extractor (store) and publishers
  pty-session/         runs a command in a PTY for one transport
  websocket-server/    the HTTP/WebSocket server, origin policy and the ws transport
  session-lifecycle/   what both session kinds share: hello, start at the browser's size, input queue, shutdown
  ink-session/         runs an Ink app in-process on fake TTY streams
  serve-command/       serveTty + runPtySession: serve one program
  serve-ink/           serveTty + runInkSession: serve one Ink app
  commander-catalog/   reads a commander program into a command catalog
  command-launcher/    offers the catalog and runs the chosen command, one at a time
  serve-commander/     serveTty + runLauncherSession: serve a commander CLI with a launcher
```

Dependencies point one way: `serve-command`, `serve-ink` → `pty-session`, `ink-session`, `websocket-server`
→ `session-lifecycle` → `session-transport`; `pty-session` also uses `osc-channel`. Everything speaks
`@treactui/protocol`.
