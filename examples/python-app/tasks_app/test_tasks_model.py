import unittest

from .tasks_model import Task, TasksModel


class TasksModelTest(unittest.TestCase):
    def test_the_starter_list_has_nothing_done_and_the_first_task_selected(self):
        model = TasksModel.starter()
        self.assertEqual([task.done for task in model.tasks], [False, False, False])
        self.assertEqual(model.cursor, 0)
        self.assertEqual(model.progress, "0 of 3 done")

    def test_move_stops_at_both_ends(self):
        model = TasksModel.starter()
        model.move(-1)
        self.assertEqual(model.cursor, 0)
        model.move(1)
        model.move(1)
        model.move(1)
        self.assertEqual(model.cursor, 2)

    def test_toggle_flips_the_selected_task_only_and_counts_progress(self):
        model = TasksModel.starter()
        model.move(1)
        model.toggle()
        self.assertEqual([task.done for task in model.tasks], [False, True, False])
        self.assertEqual(model.progress, "1 of 3 done")
        model.toggle()
        self.assertEqual(model.progress, "0 of 3 done")

    def test_add_appends_a_numbered_task_and_selects_it(self):
        model = TasksModel.starter()
        model.add()
        self.assertEqual(model.tasks[-1].title, "New task 4")
        self.assertEqual(model.cursor, 3)

    def test_an_empty_list_ignores_move_and_toggle(self):
        model = TasksModel([])
        model.move(1)
        model.toggle()
        self.assertEqual((model.cursor, model.tasks, model.progress), (0, [], "0 of 0 done"))

    def test_a_task_starts_not_done(self):
        self.assertFalse(Task("x").done)


if __name__ == "__main__":
    unittest.main()
