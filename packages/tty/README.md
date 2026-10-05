# @trectui/tty

A real terminal in the browser, with an accessibility layer, for any React app.

```tsx
import { TTY } from '@trectui/tty'

<TTY url="ws://localhost:8080/term" />
```

`TTY` renders [xterm.js](https://xtermjs.org) (screen-reader mode on), connects to a
backend over WebSocket, and draws a visually hidden, semantic twin of the screen
from `a11y-snapshot` messages so assistive technology gets real ARIA instead of a
scraped buffer. Your bundler must be able to import CSS (`@xterm/xterm/css/xterm.css`).

Keyboard: the terminal captures Tab and most keys, so **Ctrl+Shift+M** hands focus
back to the page.

## Command launcher

When the backend offers commands (a `commands` message, for example from `serveCommander` in
[`@trectui/tty-node`](../tty-node)), `TTY` first shows an accessible form: pick a command, fill in
its arguments and options, press Run. Every field has a label, a field that is wrong gets an error tied
to it and focus, and each change of screen moves focus: to the form's heading on arrival, to the terminal
when a command starts, to "Back to commands" when it ends. Stop ends a running command; use
Ctrl+Shift+M to leave the terminal and reach it by keyboard.

Arguments reach the program as an argument list; a value that starts with a dash is passed after `--`, so
typed text is never read as an option. A variadic argument is split on spaces.

## The protocol

The wire messages live in [`@trectui/protocol`](../protocol), shared with the backend
adapters.

## How this package is organised

Vertical feature slices: one folder per outcome, each with an `index.ts` that is its
whole public API, flat role-suffixed files, tests beside what they test.

```
src/
  index.ts                  the package's public API: TTY
  transport/                the WebSocket client; queues sends until the socket opens
  command-launcher/         the accessible form: argument builder, validator and fields
  terminal-view/            xterm.js, and the keyboard-trap escape policy
  accessibility-layer/      the hidden ARIA tree and live regions, from a snapshot
  tty/                      composes the above: the TTY component and its session hook
```

Dependencies point one way: `tty` → `terminal-view`, `accessibility-layer`,
`command-launcher`, `transport` → `@trectui/protocol`. Enforced by `npm run lint` (`verticalSlices` in the root
`eslint.config.mjs`).

## Building and testing

```sh
nx build tty
nx test tty
```
