# mvd-server

Serves the real [mvd](https://github.com/russoedu/MVD) setup screens (download
list, preferences, advanced, folder picker) to `@trectui/tty`, to prove the
approach on an existing Bubble Tea application.

It is its own Go module, with `replace` directives for local checkouts:
`github.com/TReactUI/TReactUI => ../..` and `youtube-downloader => ../../../mvd`
(a sibling checkout of the mvd repository, on a branch that has `tui.NewSetupModel`
and `ScreenOutline`). It is not part of the root module or of CI.

```sh
cd examples/mvd-server && go run .          # ws://localhost:8080/term
nx serve demo                               # the page, at http://localhost:4200
```

It runs against a scratch config in a temporary folder, so it never touches your
real MVD settings or list.

## What it took, and what it found

- **mvd needed two small additions**, both in `libs/mvd-core/tui`: `NewSetupModel`
  (the models were unexported, and `RunSetup` builds its own `tea.Program`), and
  `Outline()`, a plain unstyled description of the current screen. The views and the
  outline share one key-hint list per screen, so they cannot drift. mvd does not
  import anything from this repository.
- **The TUI itself is untouched.** The browser receives the same ANSI stream a
  terminal would; there is no second UI to keep in step.
- **`Accessible()` cost about 90 lines of Go** on this side (`snapshot_outline_mapper.go`
  plus the 20-line wrapper), for four screens, and about 80 on the mvd side for the
  outline. A screen's cost is roughly one mapper function.
- **No protocol roles were missing.** The screens map onto `textbox`, `listbox` and
  `option`, `list` and `listitem`, and `status`. An open radio editor becomes a
  second `listbox` of choices.
- **Not covered:** the download screen (`tui.RunDownload`), which is a separate model
  driven by the engine. Pressing Ctrl+S on the list ends the setup program, so the
  session closes. Serving the download run would need its model and an engine to be
  started by the host.
