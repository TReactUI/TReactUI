# python-app

A to-do list written in plain Python, served to the browser with `treactui serve`. It is the Python route from
[Integrating another language](../../docs/integrating-a-language.md) in one small app: the terminal screen is what
a sighted user sees, and [`treactui_tty`](../../integrations/python) tells a screen reader what the screen means.

Keys: up and down (or `k` and `j`) move, space or Enter marks a task done, `n` adds one, `q` quits.

## Run it

From the repository root, with the demo page pointed at port 8080 (the Go demo server's port, so stop that one
first):

```sh
npx nx build tty-node
node packages/tty-node/bin/treactui.js serve --port 8080 --origin localhost:4200 --cwd examples/python-app -- python -m tasks_app
npx nx serve demo        # http://localhost:4200
```

If you have installed the package, `npx treactui serve ...` does the same. The app finds the helper in
`integrations/python` when it runs from a checkout; install it elsewhere to use it from your own project.

## How it is organised

| File | Role |
|---|---|
| `tasks_model.py` | The list and the selection |
| `render_screen_mapper.py` | The list as terminal text |
| `describe_screen_mapper.py` | The same list as an accessibility snapshot (a `listbox` of `option`s) |
| `parse_key_algorithm.py` | What a key press means |
| `read_key_client.py` | Reads a key from the terminal (Windows and Unix) |
| `run_tasks_use_case.py` | The loop: draw, describe, react |
| `__main__.py` | Wires them together |

The page announces the selected item whenever it changes, so the app announces only what that label does not
say: how many tasks are done, after a toggle.

## Tests

```sh
cd examples/python-app && PYTHONPATH=../../integrations/python python -m unittest discover -s . -t . -p "test_*.py"
```

They also run in the `tty-node` suite. They cover the model, the screens and the loop, not the key reader. That
was checked by hand on Windows, in a real browser, with the arrow keys, space and `n`; the Unix branch of
`read_key_client.py` is the standard `termios` code and has not been run.
