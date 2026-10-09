# tty-go

Serves a [Bubble Tea v2](https://github.com/charmbracelet/bubbletea) program (`charm.land/bubbletea/v2`) to
the browser for [`@treactui/tty`](../tty): the real terminal output over a
WebSocket, plus the semantic information assistive technology needs.

```sh
go get github.com/meta-tui/treactui/packages/tty-go@latest
```

It is a Go module of its own (`packages/tty-go/go.mod`), versioned by git tags named `packages/tty-go/vX.Y.Z`,
independently of the npm packages. CI creates a tag after it has passed on `main`, when a `feat` or `fix` commit
touched this folder since the last one (while the major version is 0, either bumps the patch; see
`tools/go-release`). Pin a version in your `go.mod` as usual.

```go
import ttygo "github.com/meta-tui/treactui/packages/tty-go"

mux.Handle("/term", ttygo.Handler(func() tea.Model { return newModel() }, ttygo.Options{}))
```

- Each connection runs its own program. Browser keystrokes and mouse events arrive
  as terminal input; resizes arrive as `tea.WindowSizeMsg`.
- `ttygo.SharedHandler` serves one program to every connection instead: they all see and drive the same
  screen, and it keeps running when no browser is open (a reload or a second window finds it as it was).
  It starts when the first browser connects and again after the program quits; the screen has the size
  of the latest resize.
- Mouse reporting, the alternate screen, bracketed paste and the cursor are the program's own business: a v2
  model asks for them from its `View` (`tea.View.MouseMode`, `AltScreen`) and the page's terminal follows.
  With mouse reporting on, the browser passes mouse events to the program instead of selecting text;
  Shift+drag selects. A shared program remembers which of these modes are on and puts a browser that joins
  late in the same state. Pasting text works either way (bracketed paste).
- A model may implement `ttygo.Accessible` to describe its screen. A snapshot is
  sent whenever it changes.
- A command may return `ttygo.AnnounceMsg` (screen-reader announcement) or
  `ttygo.EventMsg` (a web-only action for the page).
- Every program is started with true colour forced (`tea.WithColorProfile`): a browser is not a TTY, so
  Bubble Tea would otherwise strip every style.
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
session/    runs one program over an abstract Transport: one per connection, or one shared by all
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

For a program in another language, see [Integrating another language](../../docs/integrating-a-language.md): most
need only `treactui serve`, and the protocol's shared [conformance cases](../protocol/conformance/cases.json) are
run against this adapter's `protocol` package (`conformance_test.go`).
