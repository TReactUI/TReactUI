# tty-go

Serves a [Bubble Tea](https://github.com/charmbracelet/bubbletea) (v1) program to
the browser for [`@treactui/tty`](../tty): the real terminal output over a
WebSocket, plus the semantic information assistive technology needs.

```go
mux.Handle("/term", ttygo.Handler(func() tea.Model { return newModel() }, ttygo.Options{}))
```

- Each connection runs its own program. Browser keystrokes and mouse events arrive
  as terminal input; resizes arrive as `tea.WindowSizeMsg`.
- A model may implement `ttygo.Accessible` to describe its screen. A snapshot is
  sent whenever it changes.
- A command may return `ttygo.AnnounceMsg` (screen-reader announcement) or
  `ttygo.EventMsg` (a web-only action for the page).
- `Handler` forces true colour process-wide: a browser is not a TTY, so Lipgloss
  would otherwise strip every style.
- Only same-host pages may connect unless `Options.AllowedOrigins` says otherwise.
  The endpoint runs a program, so a foreign page must not be able to open it.

## Commands

The protocol's command catalog (`commands`, `run`, `stop`) is mirrored in `protocol/`, so a Go backend can
speak it. This adapter does not run a launcher session itself yet: a handler that wants one sends
`NewCommandsFrame` and handles `run`/`stop` messages. Incoming `resize` and `run` messages are bounded the
same way as in `@treactui/protocol`.

## Layout

Slices are Go packages, with files named `<name>_<role>.go`.

```
protocol/   wire messages and their encoding. Depends on nothing.
observer/   wraps a model: emits snapshots, turns announce/event messages into frames
session/    runs one program over an abstract Transport
socket/     the WebSocket adapter for Transport
```

The root package re-exports what a program needs (`Handler`, `Accessible`,
`Snapshot`, `A11yNode`, `AnnounceMsg`, `EventMsg`).

## Testing

```sh
go test ./packages/tty-go/...
```

`nx lint tty-go` needs `golangci-lint` installed.

## A real application

[`examples/mvd-server`](../../examples/mvd-server) serves the setup screens of an
existing Bubble Tea program (mvd) without forking its TUI. Writing `Accessible()`
for it cost about one mapper function per screen; see its README for the findings.
