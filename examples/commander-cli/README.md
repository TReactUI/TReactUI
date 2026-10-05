# commander-cli

A commander CLI (`program.js`) served to [`@trectui/tty`](../../packages/tty) two ways. It is an
ordinary program; the only line that knows about `@trectui` is `announce(...)`, which does nothing in a
real terminal.

```sh
node cli.js greet Ada --shout      # as a normal CLI
node serve.js                      # in the browser, with a launcher: ws://localhost:8080/term
nx serve demo                      # the page, at http://localhost:4200
```

`serve.js` uses `serveCommander`: the page shows a form built from the commands in `program.js`
(`greet`, `countdown`, `setup`), runs the chosen one in a terminal, and offers to run another when it ends.
`setup` uses `@clack/prompts`, which work in the browser terminal as in a real one.
