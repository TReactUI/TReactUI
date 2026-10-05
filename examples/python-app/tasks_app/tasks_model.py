"""The to-do list: what is on it, and which item is selected."""

from dataclasses import dataclass, field
from typing import List


@dataclass
class Task:
    title: str
    done: bool = False


@dataclass
class TasksModel:
    tasks: List[Task] = field(default_factory=list)
    cursor: int = 0

    @staticmethod
    def starter() -> "TasksModel":
        return TasksModel([Task("Write the docs"), Task("Ship it"), Task("Celebrate")])

    @property
    def done_count(self) -> int:
        return sum(1 for task in self.tasks if task.done)

    @property
    def progress(self) -> str:
        return f"{self.done_count} of {len(self.tasks)} done"

    def move(self, delta: int) -> None:
        """Moves the selection, stopping at the ends."""
        if self.tasks:
            self.cursor = max(0, min(len(self.tasks) - 1, self.cursor + delta))

    def toggle(self) -> None:
        """Marks the selected task done, or not done."""
        if self.tasks:
            task = self.tasks[self.cursor]
            task.done = not task.done

    def add(self) -> None:
        """Adds a task after the last one and selects it."""
        self.tasks.append(Task(f"New task {len(self.tasks) + 1}"))
        self.cursor = len(self.tasks) - 1
