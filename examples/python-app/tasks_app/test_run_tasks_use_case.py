import unittest

from .run_tasks_use_case import run_tasks
from .tasks_model import TasksModel

UP, DOWN = "\x1b[A", "\x1b[B"


def run(keys):
    """Runs the program on a list of key presses; returns what it wrote, published and announced."""
    pending = list(keys)
    screens, snapshots, announcements = [], [], []
    model = TasksModel.starter()
    run_tasks(model, lambda: pending.pop(0), screens.append, snapshots.append, announcements.append)
    return model, screens, snapshots, announcements


class RunTasksTest(unittest.TestCase):
    def test_draws_and_describes_the_screen_before_any_key(self):
        _, screens, snapshots, announcements = run(["q"])
        self.assertEqual((len(screens), len(snapshots), announcements), (1, 1, []))

    def test_every_change_redraws_and_publishes_a_fresh_snapshot(self):
        model, screens, snapshots, _ = run([DOWN, "n", UP, "q"])
        self.assertEqual(len(screens), 4)
        self.assertEqual(len(snapshots), 4)
        self.assertEqual(model.cursor, 2)
        self.assertEqual(len(model.tasks), 4)

    def test_announces_only_the_progress_after_a_toggle(self):
        _, _, _, announcements = run([DOWN, " ", " ", "q"])
        self.assertEqual(announcements, ["1 of 3 done", "0 of 3 done"])

    def test_ignores_keys_it_does_not_know_without_redrawing(self):
        _, screens, snapshots, announcements = run(["x", "\x1b[C", "q"])
        self.assertEqual((len(screens), len(snapshots), announcements), (1, 1, []))

    def test_stops_at_ctrl_c(self):
        _, screens, _, _ = run(["\x03", " "])
        self.assertEqual(len(screens), 1)


if __name__ == "__main__":
    unittest.main()
