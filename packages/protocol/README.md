# @trectui/protocol

The wire protocol between a backend and the [`@trectui/tty`](../tty) React component:
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
| browser → backend | `input` | `data`: keystrokes |
| | `resize` | `cols`, `rows` (whole numbers, 1 to 1000) |

Each direction has an encoder (a mapper) and a parser (a validator that says why it rejects a
frame). A selectable list is a `listbox` of `option` nodes: `aria-selected` is invalid on a
`listitem`.

## How this package is organised

```
src/
  index.ts            the public API
  a11y-snapshot/      the semantic description of a screen (contract only)
  server-messages/    backend → browser: contract, encoder, parser
  client-messages/    browser → backend: contract, encoder, parser
  protocol-version/   the version number, bumped on any incompatible change
```
