"""Describes the list for a screen reader: the same screen as `render_screen`, as meaning rather than pixels."""

from typing import List

from treactui_tty import A11yNode, A11ySnapshot

from .tasks_model import TasksModel


def describe_screen(model: TasksModel) -> A11ySnapshot:
    options: List[A11yNode] = []
    for index, task in enumerate(model.tasks):
        options.append({
            "role": "option",
            "label": f"{task.title}, {'done' if task.done else 'not done'}",
            "selected": index == model.cursor,
            "focused": index == model.cursor,
        })

    return {
        "title": "Tasks",
        "nodes": [
            {"role": "heading", "value": "Tasks"},
            {"role": "status", "value": model.progress},
            {"role": "listbox", "label": "Tasks", "children": options},
        ],
    }
