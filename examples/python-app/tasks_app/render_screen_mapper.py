"""Draws the list for the terminal: what a sighted user sees."""

from .tasks_model import TasksModel

_CLEAR = "\x1b[2J\x1b[H"
_BOLD = "\x1b[1m"
_DIM = "\x1b[2m"
_REVERSE = "\x1b[7m"
_RESET = "\x1b[0m"


def render_screen(model: TasksModel) -> str:
    """The whole screen as terminal text, with CRLF line ends so it draws the same everywhere."""
    lines = [f"{_BOLD}Tasks{_RESET}  {_DIM}{model.progress}{_RESET}", ""]
    for index, task in enumerate(model.tasks):
        line = f" [{'x' if task.done else ' '}] {task.title} "
        lines.append(f"{_REVERSE}>{line}{_RESET}" if index == model.cursor else f" {line}")
    lines += ["", f"{_DIM}up/down move  space toggle  n new  q quit{_RESET}"]

    return _CLEAR + "\r\n".join(lines) + "\r\n"
