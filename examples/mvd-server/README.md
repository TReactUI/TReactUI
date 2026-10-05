# mvd-server

Serves the real [mvd](https://github.com/russoedu/MVD) app to `@treactui/tty`: the
setup screens (download list, preferences, advanced, folder picker) and the download
screen, with the loop between them, to prove the approach on an existing Bubble Tea
application.

It is its own Go module, with `replace` directives for local checkouts:
`github.com/TReactUI/TReactUI => ../..` and `youtube-downloader => ../../../mvd`
(a sibling checkout of the mvd repository at `main`, which has `tui.NewAppModel` and
`ScreenOutline` since mvd#53). It is not part of the root module or of CI.

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
- **The download screen came with `tui.NewAppModel`**, a model that runs the setup screens,
  then a download run, then the setup screens again, as the terminal app does with two
  programs. The host passes a `RunStarter` (here `start_download_run_use_case.go`, which builds
  mvd's engine) and the model closes the run when the user leaves the screen. The download
  screen's `Outline()` lists the selected playlist's entries, a window of 51 around the
  selection, as a list of items with their state.
- **One program, shared by every connection** (`ttygo.SharedHandler`): reloading the page, or opening a
  second window, shows the screen as it was, and a download run keeps going while no page is open. Anyone's
  keystrokes reach the program, and the screen has the size of the latest resize. When the user quits the
  setup screens the program ends, and the next page to connect starts a fresh one.
- **Mouse and paste** (`Options.Mouse`): a click on a key bar entry presses its key, a click selects a
  setting, a playlist or an entry, and the wheel scrolls. Pasting several lines of URLs into the list works.
