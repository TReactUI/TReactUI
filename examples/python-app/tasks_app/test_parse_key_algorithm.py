import unittest

from .parse_key_algorithm import parse_key


class ParseKeyTest(unittest.TestCase):
    def test_arrow_keys_in_both_escape_forms_and_the_vi_letters(self):
        for sequence in ("\x1b[A", "\x1bOA", "k"):
            self.assertEqual(parse_key(sequence), "up", repr(sequence))
        for sequence in ("\x1b[B", "\x1bOB", "j"):
            self.assertEqual(parse_key(sequence), "down", repr(sequence))

    def test_space_and_enter_toggle(self):
        for sequence in (" ", "\r", "\n"):
            self.assertEqual(parse_key(sequence), "toggle", repr(sequence))

    def test_n_adds_and_q_or_ctrl_c_quits(self):
        self.assertEqual(parse_key("n"), "add")
        self.assertEqual(parse_key("q"), "quit")
        self.assertEqual(parse_key("\x03"), "quit")

    def test_anything_else_is_ignored(self):
        for sequence in ("", "x", "\x1b", "\x1b[C", "\x1b[D"):
            self.assertIsNone(parse_key(sequence), repr(sequence))


if __name__ == "__main__":
    unittest.main()
