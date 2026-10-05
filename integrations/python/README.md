# treactui_tty (Python)

Lets a Python program that [`@treactui/tty`](../../packages/tty) serves speak to the page: describe the
screen for a screen reader, announce changes, and tell the host page about a web-only action. No dependencies,
Python 3.8 or newer.

Serve the program with `treactui serve` (see [Integrating another language](../../docs/integrating-a-language.md)),
and import the helper from it:

```sh
npx treactui serve --origin localhost:4200 -- python app.py
```

```python
from treactui_tty import announce, publish_event, publish_snapshot

publish_snapshot({
    "title": "Tasks",
    "nodes": [
        {"role": "heading", "value": "Tasks"},
        {"role": "listbox", "label": "Tasks", "children": [
            {"role": "option", "label": "Write docs", "selected": True, "focused": True},
            {"role": "option", "label": "Ship it"},
        ]},
    ],
})
announce("Task added")                      # polite
announce("Could not save", "assertive")     # interrupts
publish_event("open-file", {"accept": ".txt"})
```

Outside `treactui serve` (a normal terminal, a pipe, a test) every call does nothing, so the same program works
everywhere. The adapter sets `TREACT_TTY=1` for the program it runs; that is the only thing the helper looks at.

A snapshot describes what the screen shows, so send a fresh one whenever it changes. A selectable list is a
`listbox` of `option` nodes with `selected: True` on the current one. The roles are `heading`, `list`,
`listitem`, `listbox`, `option`, `button`, `textbox`, `progressbar`, `status` and `text`; a `progressbar` takes
`valueNow` as a percentage.

| Function | Sends |
|---|---|
| `announce(text, politeness="polite")` | Makes screen readers read `text` aloud. |
| `publish_snapshot(snapshot)` | Describes the current screen. |
| `publish_event(name, payload=None)` | Tells the host page (its `onEvent`) that something happened. |
| `publish_app_message(message)` | The general form, for a message you built yourself. |
| `is_running_under_tty()` | Whether the program runs under the adapter. |

A message the page would not accept (a type a program may not send, or one over 1 000 000 characters) raises
`ValueError`, even outside the adapter, so a mistake shows up in development.

## Tests

```sh
cd integrations/python && python -m unittest discover -s . -t . -p "test_*.py"
```

They also run in the `tty-node` suite, which feeds this helper's real output through the adapter's own extractor
and the protocol parser (`osc-channel/python-helper.integration.spec.ts`).
