# @treactui/protocol

The wire protocol between a backend and the [`@treactui/tty`](../tty) React component:
JSON text frames over one WebSocket. It has no dependencies and runs in the browser and in
Node, so the React package and every backend adapter share one definition. The Go adapter
([`tty-go`](../tty-go)) mirrors it in `protocol/`.

| Direction | `type` | Carries |
|---|---|---|
| backend → browser | `hello` | `version` |
| | `output` | `data`: terminal output (ANSI) |
| | `a11y-snapshot` | `snapshot`: `{ title, nodes[] }` of ARIA roles |
| | `announce` | `text`, `politeness` (`polite` \| `assertive`) |
| | `event` | `name`, `payload`: a web-only action for the host page |
| | `commands` | `commands`: what the browser may run (see below) |
| browser → backend | `input` | `data`: keystrokes |
| | `resize` | `cols`, `rows` (whole numbers, 1 to 1000) |
| | `run` | `command`, `args`: run one of the offered commands (at most 100 arguments, each at most 10 000 characters, no NUL) |
| | `stop` | stop the running command |

Each direction has an encoder (a mapper) and a parser (a validator that says why it rejects a
frame). A selectable list is a `listbox` of `option` nodes: `aria-selected` is invalid on a
`listitem`.

## Commands

A backend that offers commands (for instance a commander CLI) sends a `commands` message: a list of
`CommandSpec`, each with a `name`, a `description`, its `arguments` and its `options` (a flag, whether it
takes a value, its choices, default and whether it is required). The page then shows a launcher and starts
one with `run`; the backend runs only commands from its own list. A backend that serves one program never
sends `commands`.

## How this package is organised

```
src/
  index.ts            the public API
  a11y-snapshot/      the semantic description of a screen (contract only)
  command-catalog/    the commands a backend offers: contract and parser
  server-messages/    backend → browser: contract, encoder, parser
  client-messages/    browser → backend: contract, encoder, parser
  protocol-version/   the version number, bumped on any incompatible change
```
