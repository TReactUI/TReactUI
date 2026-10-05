# TReactUI

A real terminal in the browser, with an accessibility layer, for any React app.

You have a program with a good terminal interface (a Bubble Tea app, a commander CLI, an Ink app, a Python
script). TReactUI shows that same program in a web page, as a real terminal ([xterm.js](https://xtermjs.org)) with
mouse and keyboard, and adds what a terminal cannot give a screen reader: the program describes its screen
(headings, lists, the selected item, progress) and the page renders that as real ARIA, hidden visually, next to
the terminal.

It is aimed at a program you run on your own machine and open in a local page. Mobile is out of scope.

> **Status:** pre-1.0 (`0.0.x`). Expect changes. The accessibility work has been checked with axe and a scripted
> NVDA pass; a manual pass by someone who uses NVDA every day is still open
> ([#4](https://github.com/TReactUI/TReactUI/issues/4), checklist in [docs/accessibility.md](docs/accessibility.md)).

## Quickstart

**The page (React).** Your bundler must be able to import CSS.

```sh
npm install @treactui/tty
```

```tsx
import { TTY } from '@treactui/tty'

<TTY url="ws://localhost:8080/term" />
```

**A program in any language: `treactui serve`.** It runs the program under a pseudo-terminal, one copy per
browser, and serves it on that URL. Everything after `--` is the program and its arguments.

```sh
npm install --save-dev @treactui/tty-node
npx treactui serve --origin localhost:4200 -- python app.py
```

`--origin` is the address of your page. Only same-host pages and the ones you list may connect, and the server
listens on `127.0.0.1` only, because it runs programs. A Python program can describe its screen for a screen
reader with [`treactui_tty`](integrations/python); see
[Integrating another language](docs/integrating-a-language.md) for that and for other languages.

**A commander CLI, with a launcher.** The page shows an accessible form built from your commands, arguments and
options, and runs the one the user picks.

```js
import { serveCommander } from '@treactui/tty-node'

await serveCommander({
  program,                                  // your commander Command
  command: process.execPath,
  args: ['cli.js'],
  allowedOrigins: ['localhost:4200'],
})
```

**An Ink app, in-process** (no pseudo-terminal, no native module): `serveInk`, see
[`@treactui/tty-node`](packages/tty-node#ink-in-process).

**A Bubble Tea app (Go).**

```go
import ttygo "github.com/TReactUI/TReactUI"

mux.Handle("/term", ttygo.Handler(func() tea.Model { return newModel() }, ttygo.Options{}))
```

A model that implements `ttygo.Accessible` describes its screen; a command can return `ttygo.AnnounceMsg` to have
a screen reader speak. See [`tty-go`](packages/tty-go).

## What is in this repository

| | |
|---|---|
| [`packages/tty`](packages/tty) | `@treactui/tty`: the React `TTY` component, the accessibility layer and the command launcher |
| [`packages/tty-node`](packages/tty-node) | `@treactui/tty-node`: serve a Node program, an Ink app or any command; the `treactui` command |
| [`packages/tty-go`](packages/tty-go) | The Go adapter for Bubble Tea |
| [`packages/protocol`](packages/protocol) | `@treactui/protocol`: the wire protocol, its JSON Schemas and shared conformance cases |
| [`integrations/python`](integrations/python) | `treactui_tty`: lets a served Python program describe its screen |
| [`apps/demo`](apps/demo), [`apps/demo-server`](apps/demo-server) | A Vite page, and a Go to-do list to serve to it |
| [`examples/`](examples) | `commander-cli`, `ink-app`, `python-app`, and `mvd-server` (needs a sibling checkout of the mvd repository) |
| [`docs/`](docs) | [Accessibility](docs/accessibility.md): what was checked and what was not. [Integrating another language](docs/integrating-a-language.md) |

How it works: one WebSocket carries JSON messages. The backend sends the terminal's output and, optionally, a
description of the screen, announcements and events; the page sends keystrokes, resizes and, for a launcher,
the command to run. The messages are defined in [`@treactui/protocol`](packages/protocol).

## Trying it

```sh
npm ci
npx nx start demo-server     # a Go to-do list on ws://localhost:8080/term
npx nx serve demo            # the page, at http://localhost:4200
```

Other combinations are in each example's README.

## Contributing

- **Issues first.** Open a GitHub issue with acceptance criteria before building, reference it in the commit
  (`Refs #12`), and close it when it is released.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org) and are checked by commitlint
  (a lowercase subject, a header of at most 100 characters). `feat` and `fix` commits release.
- **The gate** is what CI runs: `npx nx run-many -t lint typecheck test build`. Go needs Go 1.24 or newer;
  the Python tests need Python 3.
- **Every push to `main` can publish to public npm.** CI runs `nx release`, which versions and publishes the
  packages that have `feat` or `fix` commits since their last release.
- **Structure** is vertical feature slices: a folder per outcome with an `index.ts` as its whole public API, and
  files named for their role (`.use-case.ts`, `.contract.ts`, `.algorithm.ts`...). `npm run lint` enforces it.
- The workspace is built with [Nx](https://nx.dev) and was scaffolded with MNCI.
