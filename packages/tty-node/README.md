# @trectui/tty-node

Serves a Node program to [`@trectui/tty`](../tty) over a WebSocket: each browser gets its own copy
of the program in a pseudo-terminal ([node-pty](https://github.com/microsoft/node-pty)), so
anything that writes to a terminal works: commander CLIs, prompt libraries
([@clack/prompts](https://github.com/bombshell-dev/clack), inquirer), Ink, blessed.

```js
import { serveCommand } from '@trectui/tty-node'

await serveCommand({ command: 'node', args: ['cli.js', 'setup'], allowedOrigins: ['localhost:4200'] })
// ws://127.0.0.1:8080/term
```

## Security

The endpoint runs programs, so it is closed by default:

- it listens on `127.0.0.1` only (`host` opts in to more);
- a page may connect only if it was served from the same host, or is listed in `allowedOrigins`
  (this stops a foreign web page driving your local terminal through the visitor's browser);
- the program is fixed by the server; the browser cannot choose what to run.

## Speaking to the page from the program

A program in a PTY is a separate process, so it publishes through its own output: a private OSC
sequence (`ESC ] 7770 ; <json> BEL`) that the adapter strips and turns into protocol messages. From
Node:

```js
import { announce, publishSnapshot } from '@trectui/tty-node'

announce('Download finished')                         // read aloud by a screen reader
publishSnapshot({ title: 'Tasks', nodes: [/* ARIA */] }) // see @trectui/protocol
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
  serve-command/       serveTty + runPtySession: serve one program
```

Dependencies point one way: `serve-command` → `pty-session`, `websocket-server` → `osc-channel`,
`session-transport` → `@trectui/protocol`.
