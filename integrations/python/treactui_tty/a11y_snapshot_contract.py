"""The shape of an accessibility snapshot: what the screen shows, for a screen reader.

These mirror schema/server-message.schema.json in @treactui/protocol. They are type
hints for editors and type checkers; nothing here is checked when the program runs.
"""

from typing import List, Literal, TypedDict

A11yRole = Literal[
    "heading",
    "list",
    "listitem",
    "listbox",
    "option",
    "button",
    "textbox",
    "progressbar",
    "status",
    "text",
]


class _A11yNodeRequired(TypedDict):
    role: A11yRole


class A11yNode(_A11yNodeRequired, total=False):
    label: str
    value: str
    # Progress as a percentage, for a progressbar.
    valueNow: float
    selected: bool
    focused: bool
    children: List["A11yNode"]


class A11ySnapshot(TypedDict):
    title: str
    nodes: List[A11yNode]
