import unittest

from .describe_screen_mapper import describe_screen
from .tasks_model import TasksModel


class DescribeScreenTest(unittest.TestCase):
    def test_describes_a_titled_screen_with_a_listbox_of_options(self):
        snapshot = describe_screen(TasksModel.starter())
        self.assertEqual(snapshot["title"], "Tasks")
        self.assertEqual([node["role"] for node in snapshot["nodes"]], ["heading", "status", "listbox"])
        self.assertEqual(snapshot["nodes"][1]["value"], "0 of 3 done")
        self.assertEqual([child["role"] for child in snapshot["nodes"][2]["children"]], ["option"] * 3)

    def test_each_option_says_whether_it_is_done_and_only_one_is_selected(self):
        model = TasksModel.starter()
        model.move(2)
        model.toggle()
        options = describe_screen(model)["nodes"][2]["children"]
        self.assertEqual([option["label"] for option in options], ["Write the docs, not done", "Ship it, not done", "Celebrate, done"])
        self.assertEqual([option["selected"] for option in options], [False, False, True])
        self.assertEqual([option["focused"] for option in options], [False, False, True])


if __name__ == "__main__":
    unittest.main()
