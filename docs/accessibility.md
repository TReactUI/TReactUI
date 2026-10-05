# Accessibility verification

What has been checked, how to check it again, and what has **not** been checked.

## Automated: axe

### In the test suite (jsdom)

`nx test tty` runs [axe](https://github.com/dequelabs/axe-core) through `jest-axe` on the command launcher
(also with its errors showing), the accessibility layer (with a screen described, and with an announcement)
and the `TTY` while a command runs and after it has finished
(`packages/tty/src/tty/accessibility.integration.spec.tsx`). jsdom has no layout, so axe cannot check colour
contrast or focus visibility there.

### In a real browser

Run on 2026-10-05, Chromium, `examples/commander-cli` served with `serveCommander`, the demo page open.
axe-core 4.13 was injected into the page and run in each state:

| State | Violations | Needs review |
|---|---|---|
| Launcher | none | none |
| Launcher, with an error showing | none | none |
| A command running | none | colour contrast of terminal text |
| A command finished | none | colour contrast of terminal text |

To repeat it: start `node examples/commander-cli/serve.js` and `nx serve demo`, open the page, and run
`axe.run(document)` (from `node_modules/axe-core/axe.min.js`) in each state.

The first run flagged one item for review: the terminal's container had an `aria-label` but no role, which
ARIA does not allow on a generic element. It is now a `group`, and the item is gone.

### Colour contrast

axe reports contrast as "needs review" on terminal text because xterm.js draws it as many styled spans. The
colours are the served program's own, so they have to be checked per program. For the demo (white-ish text
on black, WCAG AA needs 4.5:1 for normal text):

| Colour | On | Ratio |
|---|---|---|
| xterm default text `#ffffff` | black | 21.0:1 |
| Title `#7dd3fc` | black | 12.6:1 |
| Selected row `#0f172a` | `#7dd3fc` | 10.7:1 |
| Key hint text `#94a3b8` | black | 8.2:1 |
| Done item `#7c8ba1` | black | 6.1:1 (was `#64748b`, 4.41:1: fixed) |

## Not verified: NVDA

**NVDA has not been run against this.** It is a screen reader that a person runs on Windows, and nothing
here has been heard through one. The structure is correct as far as axe and the browser's accessibility
tree can tell (a labelled region, a `listbox` of `option`s with the selection, live regions, a labelled
form), but how NVDA actually reads it, and in particular the questions marked **?** below, is unknown.

Setup: NVDA with Chrome or Firefox. Start `node examples/commander-cli/serve.js` and `nx serve demo`, open
http://localhost:4200. For the single-program demo, stop that server and run
`cd apps/demo-server && go run .` instead.

Record the NVDA version, the browser and the result in each row.

### The launcher (commander CLI)

| # | Do this | Expect | Result |
|---|---|---|---|
| 1 | Open the page | NVDA reads "Run a command" (focus moves to the heading) | ☐ |
| 2 | Tab through the form | Each field is announced with its label; "name (required)"; the description of the command is read with the select | ☐ |
| 3 | Run `greet` with no name | An alert says "There is 1 problem: name is required"; focus goes to the name field, announced as invalid | ☐ |
| 4 | Fill in, press Run | The terminal takes focus; **?** the output is read, or can be read in browse mode | ☐ |
| 5 | Command ends | "greet exited with code 0" is read; focus is on "Back to commands" | ☐ |
| 6 | Run `countdown`, press Ctrl+Shift+M, Tab to Stop, Enter | Focus leaves the terminal; "countdown stopped" is read | ☐ |
| 7 | Run `setup` | The prompts can be answered by keyboard; **?** NVDA reads the prompt text as it changes | ☐ |
| 8 | After `setup` | "Setup finished for …" is announced (a polite live region) | ☐ |

### The single-program demo (a Bubble Tea list)

| # | Do this | Expect | Result |
|---|---|---|---|
| 9 | Open the page, focus the terminal | The terminal is announced as "Terminal input" inside "Tasks terminal" | ☐ |
| 10 | **?** Ctrl+Shift+M, then browse mode (NVDA+Space) | The hidden "Tasks" region is reachable: a list of options, the selected one marked | ☐ |
| 11 | Back in the terminal, Down, Space | The change is announced ("… : done") through the live region | ☐ |
| 12 | **?** Down arrow repeatedly | Whether the selected option is announced as the selection moves (it is a hidden list, not focus) | ☐ |

### Keyboard

| # | Do this | Expect | Result |
|---|---|---|---|
| 13 | Tab into the terminal, press Tab | Tab goes to the program (it is a terminal), so Tab alone cannot leave it | ☐ |
| 14 | Press Ctrl+Shift+M | Focus leaves the terminal; Tab / Shift+Tab move through the page again | ☐ |

## Known design limits to watch for in NVDA

- The accessibility layer is visually hidden and not focusable, so it is read in browse mode, not with
  focus. Rows 10 and 12 decide whether that is enough or whether the selected option needs to be exposed
  as focus (for instance `aria-activedescendant` on the terminal).
- When a backend sends no snapshots, xterm.js's own screen-reader mode is on. It reads redrawing screens
  poorly; it suits append-only output.
- Colours of the served program are its own; see the contrast table above for how to check them.
