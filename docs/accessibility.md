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

## NVDA: a scripted pass

Run on 2026-10-05 with **NVDA 2026.1.1** (portable copy, silent "no speech" synthesizer) and **Chrome** on
Windows 11, driving the demo with real keystrokes. What NVDA *would have said* is read from its debug log
(`--debug-logging`), line by line with the time it was spoken, so each action is paired with its speech.
This verifies **what is announced**. It does **not** verify how pleasant it is to use (see the end).

### What it found, and what changed

| # | Found with NVDA | Now |
|---|---|---|
| 1 | After a launched command, NVDA said only `Back to commands button`. The outcome (`greet exited with code 0`) was lost because focus moved at the same moment; the output was reachable only by pressing Down into 64 xterm rows (`list with 64 items Hello, Ada!` then `blank` 63 times). | The outcome and a summary of the output are the button's description: `Back to commands button greet exited with code 0. Output: Hello, Ada!`. The output is also a labelled region of plain text (`Output of greet region Hello, Ada!`), and the empty terminal rows are hidden from assistive technology once it exists. Focus waits for the output to be read, because a screen reader speaks a button's description when it takes focus. |
| 2 | Moving the selection in the list demo was silent (NVDA echoed only `blank`). | When the selected option changes, its name is announced about 110 ms after the key (`Press Ctrl+Shift+M to leave the terminal, open`). The first screen is not announced, nor a redraw that leaves the selection where it was. |
| 3 | Ctrl+Shift+M left focus on the bare document: NVDA said `Demo document`, stayed in focus mode, and browse-mode keys (`h`, `r`, `l`, Down) did nothing. | Focus moves into the described screen's region (`Tasks region Tasks heading level 1 Tasks list …`), where browse mode works; with no described screen it lands on the terminal's container, never the bare document. |
| 4 | The described list was a `listbox`, which NVDA reads as one stop in browse mode (options only read in focus mode), though pressing arrows on a read-only mirror does nothing. | It is rendered as a plain list of items, read one by one, with the selected item marked `aria-current` (`Press Ctrl+Shift+M to leave the terminal, open current`). |

A mistake along the way, kept as a warning: giving the terminal's container (and the region) a permanent
`tabindex="-1"` made NVDA stay in **browse mode** when the terminal's text field took focus, so arrow keys moved
NVDA's cursor out of the terminal instead of reaching the program. `tabindex` is now set only at the moment
focus is moved there.

### What the scripted pass confirmed already worked

- On load: `main landmark form Run a command heading level 2`.
- The command select with its description: `Command combo box greet collapsed Print a greeting`.
- A required field: `name (required) edit required who to greet blank`.
- An empty submit is announced (`alert There is 1 problem`) and the field keeps focus.
- After Run, focus is in the terminal (`Tasks terminal grouping`, `Terminal input edit`).
- A change made with Space is announced through the live region (`…: done`).

### To repeat it

The driver and the step files are in [`tools/nvda`](../tools/nvda), with its README: a portable NVDA with a silent
configuration, Chrome as an app window with `--force-renderer-accessibility`, keys sent with `SendKeys`, and the
`Speaking [...]` lines read from NVDA's debug log. It takes over the keyboard for a few minutes while it runs.

### Not verified

- **How it feels** to someone who uses NVDA every day. A transcript shows what is spoken, not whether the flow is
  natural, how it behaves at real speaking speed, or what a user's own settings change. A person who uses NVDA
  should run the checklist below.
- **Firefox, JAWS, Narrator, VoiceOver, TalkBack.** Only NVDA with Chrome was run.
- **Long-running output.** During a run, xterm.js's own live region still speaks (`Too much output to announce,
  navigate to rows manually to read`), and a program that prints continuously has not been tried.
- **A test-driver artefact:** under `SendKeys`, the first Down after Tab did not move the selection in the list demo
  (three runs, same every time), so announcements line up with the second press. A single ArrowDown sent by
  Playwright did move it, so this is probably the driver, not the product; a human at a keyboard should confirm.
- The `setup` flow with prompts, Stop, and the `countdown` command were not part of this scripted pass.

## Manual checklist for a person using NVDA

Record the NVDA version, the browser and the result in each row. `✓` marks what the scripted pass already showed.

### The launcher (commander CLI)

| # | Do this | Expect | Scripted pass | Result |
|---|---|---|---|---|
| 1 | Open the page | NVDA reads "Run a command" | ✓ | ☐ |
| 2 | Tab through the form | Each field is announced with its label; "name (required)"; the command's description is read with the select | ✓ | ☐ |
| 3 | Run `greet` with no name | An alert says "There is 1 problem: name is required"; the name field keeps focus | ✓ | ☐ |
| 4 | Fill in, press Run | The terminal takes focus | ✓ | ☐ |
| 5 | Command ends | "Back to commands button, greet exited with code 0. Output: Hello, Ada!" | ✓ | ☐ |
| 6 | Press Down from the button | "Output of greet region", then the output as text | ✓ | ☐ |
| 7 | Run `countdown`, press Ctrl+Shift+M, Tab to Stop, Enter | Focus leaves the terminal; "countdown stopped" | | ☐ |
| 8 | Run `setup` | The prompts can be answered by keyboard; the prompt text is read as it changes | | ☐ |
| 9 | After `setup` | "Setup finished for …" is announced | | ☐ |

### The single-program demo (a Bubble Tea list)

| # | Do this | Expect | Scripted pass | Result |
|---|---|---|---|---|
| 10 | Tab into the terminal | "Tasks terminal grouping, Terminal input edit" | ✓ | ☐ |
| 11 | Down / Up | The new selection is announced | ✓ | ☐ |
| 12 | Space | The change is announced (`…: done`) | ✓ | ☐ |
| 13 | Ctrl+Shift+M | "Tasks region, Tasks heading, Tasks list …"; focus is in browse mode | ✓ | ☐ |
| 14 | Down arrow in browse mode | Each task is read in turn, the selected one as "current" | ✓ | ☐ |

### Keyboard

| # | Do this | Expect | Scripted pass | Result |
|---|---|---|---|---|
| 15 | Tab into the terminal, press Tab | Tab goes to the program (it is a terminal), so Tab alone cannot leave it | | ☐ |
| 16 | Press Ctrl+Shift+M | Focus leaves the terminal into the screen region (or the terminal's container), never the bare document | ✓ | ☐ |

## Known design limits

- When a backend sends no snapshots, xterm.js's own screen-reader mode is on. It reads redrawing screens
  poorly; it suits append-only output.
- Colours of the served program are its own; see the contrast table above for how to check them.
