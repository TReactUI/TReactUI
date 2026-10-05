"""The program: draw, describe, then react to keys until the user quits."""

from typing import Callable

from treactui_tty import A11ySnapshot

from .describe_screen_mapper import describe_screen
from .parse_key_algorithm import parse_key
from .render_screen_mapper import render_screen
from .tasks_model import TasksModel


def run_tasks(
    model: TasksModel,
    read_key: Callable[[], str],
    write: Callable[[str], None],
    publish_snapshot: Callable[[A11ySnapshot], None],
    announce: Callable[[str], None],
) -> None:
    """Runs until the user quits.

    Everything outside the program is passed in, so a test can drive it with a list of keys.
    The page already announces the selected item when it changes, so the program announces only what that
    label does not say: how many tasks are done.
    """

    def show() -> None:
        write(render_screen(model))
        publish_snapshot(describe_screen(model))

    show()
    while True:
        action = parse_key(read_key())
        if action == "quit":
            return
        if action == "up":
            model.move(-1)
        elif action == "down":
            model.move(1)
        elif action == "toggle":
            model.toggle()
        elif action == "add":
            model.add()
        else:
            continue
        show()
        if action == "toggle":
            announce(model.progress)
