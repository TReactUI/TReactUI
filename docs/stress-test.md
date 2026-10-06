# Long-running and high-volume output

What happens when a served program prints a lot, or announces too much: what was measured, what it found, what was
changed, and what was not tested. The program and the tools are in [`tools/stress`](../tools/stress), so the
numbers can be reproduced.

All of it was measured on one Windows machine (Node 24, Chromium from Playwright, ConPTY), through the real CLI,
a real pseudo-terminal, a real WebSocket and the real `TTY` component in the demo page. No screen reader was
involved: what it would say is inferred from how many times the page changes its live regions.

## Results

| Question | Before | After |
|---|---|---|
| **Server memory** when the browser stops reading while a program prints 2 000 000 lines (150 MB) | 85 MB to **352 MB**: everything was buffered, and a program that never stops would grow without limit | **84 to 90 MB**, flat. Reading again delivers all 2 000 000 lines, in order |
| **Page memory** while 500 000 lines (42 MB) arrive | 15 MB to 17 MB | unchanged: terminal scrollback is bounded |
| **Page responsiveness** during that flood | no long task, worst frame gap 27 ms | unchanged |
| **Snapshots**: 200 a second, 50 options each, for 10 s | no long task, worst frame gap 27 ms, heap back to its baseline | unchanged: React applies about 2 mutations per snapshot |
| **Announcements**: 200 a second for 10 s | live region changed **1 216** times (about 120 a second) | **39** times (about 3 a second) |
| **Run summary** after 5 000 lines in the launcher | "Output: line 3978. line 3979...", and "1 017 more lines": the start was silently gone | says that the first 3 977 lines are no longer available, and reads the last ones |

## What was changed

- **A slow browser makes the program wait** ([`tty-node`](../packages/tty-node#a-slow-browser)). Past 1 MiB
  waiting to be delivered the PTY stops being read, so the program's writes block as they would on a slow terminal,
  and it resumes under 256 KiB. Nothing is dropped.
- **The terminal's scrollback is a stated limit**: 1 000 lines (`SCROLLBACK_LINES`). It is what bounds the page's
  memory however long a program prints.
- **The summary tells the truth about long output.** The terminal counts the lines it discarded. When there are
  any, the spoken summary says how many are gone and reads the last lines (a long command's result, or its error, is
  at the end), and the output region's label says that it holds only the end.
- **Announcements are paced**: the first is spoken at once, anything within the next 400 ms is held and only the
  latest is delivered (an assertive one is never displaced by a polite one). A person cannot follow more than a few
  a second, and a screen reader would otherwise queue all of them.

Each change has tests that fail without it (checked by disabling the change and watching them fail).

## What was not found to be a problem

Snapshots at high frequency: the accessibility tree is rebuilt by React, and 200 snapshots a second of a 50-option
list cost no long task and no growth.

## Not covered

- **What a screen reader says.** The announcement count is a proxy. NVDA, JAWS, VoiceOver and Narrator may coalesce
  or queue differently, and the terminal's own screen-reader mode (xterm.js) still reports new rows during a burst
  of output: about 340 live-region nodes for 500 000 lines in this test. A program that prints continuously will be
  read continuously in the terminal region.
- **Time.** The runs lasted seconds to a minute, not hours.
- **Other systems.** Only Windows was measured. Linux and macOS use a different PTY, and `pause` and `resume` are
  node-pty's there, but have not been exercised.
- **Ink served in-process** (`serveInk`): its output comes from your own code, which the server cannot pause.
- **Several browsers at once**, and a browser that disappears without closing the socket.
- **Programs that redraw the whole screen very fast** (a full-screen animation). The terminal handles the bytes, but
  there is no measurement of how that looks.

## Repeating it

```sh
npx nx build tty-node
# Server memory with a browser that stops reading (prints the server's memory every 2 s, then checks every line arrived):
node packages/tty-node/bin/treactui.js serve --port 0 -- node tools/stress/flood-output.cjs 2000000 80
node tools/stress/slow-reader.cjs <port from the line above> <pid of that node process> 16
```

For the page, serve a program on 8080 with `--origin localhost:4200`, run `npx nx serve demo`, and open the page
with a browser you can script. `flood-output.cjs 500000 80 0 wait` waits for you to type `g` and Enter, so you can
install your measurements first; `flood-snapshots.cjs 200 10 50 [announce]` does the same for snapshots and
announcements. The measurements used `performance.memory`, a `PerformanceObserver` for long tasks, a
`requestAnimationFrame` loop for frame gaps, and a `MutationObserver` on the live regions.
