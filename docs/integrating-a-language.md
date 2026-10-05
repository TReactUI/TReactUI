# Integrating another language

`@treactui/tty` is a real terminal in the browser, so a program in any language can be served to it. There are
two routes. Most programs need only the first.

| Your program | Route |
|---|---|
| Writes to a terminal (Python, Rust, C#, Java, a shell script...) | **1. Serve it under a PTY** with `treactui serve` |
| A Bubble Tea app | The Go adapter, [`tty-go`](../packages/tty-go) |
| Embeds its own web server, cannot use a PTY, or wants to describe its own state | **2. Write a native adapter** |

## 1. Serve any program under a PTY

```sh
npx treactui serve --origin localhost:4200 -- python app.py
# Serving "python app.py" at ws://127.0.0.1:8080/term
```

```tsx
<TTY url="ws://localhost:8080/term" />
```

Every browser that connects gets its own copy of the program, in a pseudo-terminal, started at the size the page
reports. What the program prints is what the page shows. Options and the safety defaults are in
[`@treactui/tty-node`](../packages/tty-node#from-the-command-line-in-any-language).

### Telling a screen reader more (the side channel)

A terminal is a grid of characters, so a screen reader cannot tell a selected list item from a decoration. A served
program can describe its screen, and announce changes, by printing a **private escape sequence** on its own output:

```
ESC ] 7770 ; <json> BEL          (bytes 0x1B 0x5D 0x37 0x37 0x37 0x30 0x3B ... 0x07)
```

- `<json>` is one [server message](../packages/protocol/schema/server-message.schema.json): `announce`,
  `a11y-snapshot` or `event`. Anything else is dropped, and `output` and `hello` are not for programs to send.
- The adapter removes the sequence before the text reaches the page, so it never shows up on screen. A normal
  terminal ignores an unknown OSC code, and the sequence is only meant to be written under the adapter, which sets
  the environment variable `TREACT_TTY=1`. **Write nothing unless that variable is `1`.**
- The JSON has no raw control characters (JSON escapes them), so nothing inside it can end the sequence early.
  Keep a message under 1 000 000 characters; a longer one is passed through as text.
- Send a fresh snapshot whenever the screen changes. A snapshot is a list of nodes with ARIA-like roles (`heading`,
  `listbox` of `option`s, `textbox`, `progressbar`, `status`...). A selectable list is a `listbox`, and the selected
  option has `selected: true`.

Python has a helper, [`treactui_tty`](../integrations/python):

```python
from treactui_tty import announce, publish_snapshot

publish_snapshot({"title": "Tasks", "nodes": [
    {"role": "listbox", "label": "Tasks", "children": [
        {"role": "option", "label": "Write docs", "selected": True},
        {"role": "option", "label": "Ship it"},
    ]},
]})
announce("Task added")
```

For another language, it is a few lines: check `TREACT_TTY`, serialise the message as JSON, write
`"\x1b]7770;" + json + "\x07"` to stdout and flush. The helper's tests show the cases to cover, and every message
you build can be checked against the schema (see [Checking an implementation](#checking-an-implementation)).

## 2. A native adapter

Write one when the program serves its own web UI, cannot run under a PTY, or can describe its screen from its own
state (as the Go adapter does with `Accessible()`). The adapter speaks the [protocol](../packages/protocol) over one
WebSocket: JSON text frames, one message each.

**What it sends (backend to browser)**

1. `hello` with `version: 1`, first. The page does not act on it yet; send it anyway, so a later version check works.
2. `output` with the program's terminal output (ANSI), as it is produced, in order.
3. `a11y-snapshot`, `announce` and `event` when there is something to say. `event` named `exit` with
   `{ "exitCode": n }` as its payload reports that the program ended: the page's `onEvent` receives it, and a run
   started from the launcher shows the exit code.
4. `commands`, only when the browser should offer a launcher for several commands (see below).

**What it accepts (browser to backend)**

- `input`: write `data` to the program's input as is.
- `resize`: `cols` and `rows`, whole numbers from 1 to 1000. The page sends one as soon as it knows its size, so
  start the program at that size rather than guessing; fall back to a default after a short wait if none arrives
  (the PTY adapter waits 500 ms).
- `run` and `stop`: only if you sent `commands`.

**Treat every client frame as untrusted input.**

- Drop a frame that does not validate; do not crash and do not act on a partial message.
- A `run` message is a request for a command **you offered**. Look it up in your own list, pass the arguments to the
  process as an argument list, and **never build a shell command line from it**. It is bounded (at most 100
  arguments of 10 000 characters, no NUL) so that it is safe to turn into a process.
- **Listen on loopback only** (`127.0.0.1`) unless the user asks otherwise, because the endpoint runs programs.
- **Check the `Origin` header** on the upgrade request and refuse a page you did not allow (answer `403`), since a
  malicious web page can open a WebSocket to `localhost`. The rule used here: no `Origin` header (a non-browser
  client) is allowed; the same host as the request is allowed; anything else must be on an allow list.
- Refuse other paths (`404`).

## Checking an implementation

The protocol ships two [JSON Schemas](../packages/protocol/schema) (one per direction) and a shared list of
[conformance cases](../packages/protocol/conformance/cases.json): raw frames, which direction they travel, and
whether they are valid. The TypeScript parsers, the schemas and the Go adapter all run the same list, so they
agree. To add a language:

1. Read `cases.json` from the installed package (`@treactui/protocol/conformance/cases.json`), or copy it.
2. For each `direction: "client"` case, check that your decoder accepts it exactly when `valid` is true. This is the
   one that matters for security, and it includes the limits (resize bounds, NUL, size of `run`).
3. For each `direction: "server"` case with `valid: true`, check that what you build for the same message is equal
   to it as JSON. (`skip` names checks a case does not apply to.)
4. Check that every message you can produce validates against `server-message.schema.json`, for example with
   Ajv, `jsonschema` or `serde_json`'s schema crates.

The Go test, [`conformance_test.go`](../packages/tty-go/protocol/conformance_test.go), is a short example of steps 2
and 3.
