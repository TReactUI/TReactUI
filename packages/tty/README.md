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
  terminal-view/            xterm.js, and the keyboard-trap escape policy
  accessibility-layer/      the hidden ARIA tree and live regions, from a snapshot
  tty/                      composes the above: the TTY component and its session hook
```

Dependencies point one way: `tty` → `terminal-view`, `accessibility-layer`,
`transport` → `@trectui/protocol`. Enforced by `npm run lint` (`verticalSlices` in the root
`eslint.config.mjs`).

## Building and testing

```sh
nx build tty
nx test tty
```
