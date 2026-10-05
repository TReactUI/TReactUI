"""Entry point: `python -m tasks_app`. Serve it with `treactui serve --cwd examples/python-app -- python -m tasks_app`."""

import sys
from pathlib import Path

# Run from a checkout of the repository: use the helper beside this example instead of an installed copy.
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "integrations" / "python"))

from treactui_tty import announce, publish_snapshot  # noqa: E402

from .read_key_client import raw_terminal, read_key  # noqa: E402
from .run_tasks_use_case import run_tasks  # noqa: E402
from .tasks_model import TasksModel  # noqa: E402


def write(text: str) -> None:
    sys.stdout.write(text)
    sys.stdout.flush()


with raw_terminal():
    run_tasks(TasksModel.starter(), read_key, write, publish_snapshot, announce)
