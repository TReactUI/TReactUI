import re
import unittest

from .render_screen_mapper import render_screen
from .tasks_model import TasksModel


def plain(text):
    """The text without its colour and cursor codes."""
    return re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", text)


class RenderScreenTest(unittest.TestCase):
    def test_clears_the_screen_and_uses_crlf_line_ends(self):
        screen = render_screen(TasksModel.starter())
        self.assertTrue(screen.startswith("\x1b[2J\x1b[H"))
        self.assertNotIn("\n", screen.replace("\r\n", ""))

    def test_shows_the_title_progress_and_every_task_with_its_state(self):
        model = TasksModel.starter()
        model.move(1)
        model.toggle()
        lines = plain(render_screen(model)).split("\r\n")
        self.assertEqual(lines[0], "Tasks  1 of 3 done")
        self.assertEqual(lines[2:5], ["  [ ] Write the docs ", "> [x] Ship it ", "  [ ] Celebrate "])

    def test_marks_only_the_selected_task_in_reverse_video(self):
        screen = render_screen(TasksModel.starter())
        self.assertEqual(screen.count("\x1b[7m"), 1)
        self.assertIn("\x1b[7m>", screen)


if __name__ == "__main__":
    unittest.main()
