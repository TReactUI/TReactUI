import io
import json
import unittest

from .app_channel_client import (
    announce,
    is_running_under_tty,
    publish_app_message,
    publish_event,
    publish_snapshot,
)

UNDER_TTY = {"TREACT_TTY": "1"}
START = "\x1b]7770;"
BEL = "\x07"


def frame_of(text):
    """The JSON payload of one framed message, after checking the framing."""
    assert text.startswith(START) and text.endswith(BEL), repr(text)
    return json.loads(text[len(START):-len(BEL)])


class IsRunningUnderTtyTest(unittest.TestCase):
    def test_true_only_when_the_adapter_set_the_variable(self):
        self.assertTrue(is_running_under_tty(UNDER_TTY))
        self.assertFalse(is_running_under_tty({}))
        self.assertFalse(is_running_under_tty({"TREACT_TTY": "0"}))
        self.assertFalse(is_running_under_tty({"TREACT_TTY": "true"}))


class AnnounceTest(unittest.TestCase):
    def test_writes_one_framed_message(self):
        out = io.StringIO()
        announce("Saved", output=out, env=UNDER_TTY)
        self.assertEqual(frame_of(out.getvalue()), {"type": "announce", "text": "Saved", "politeness": "polite"})

    def test_can_be_assertive(self):
        out = io.StringIO()
        announce("Failed", "assertive", output=out, env=UNDER_TTY)
        self.assertEqual(frame_of(out.getvalue())["politeness"], "assertive")

    def test_rejects_an_unknown_politeness(self):
        with self.assertRaises(ValueError):
            announce("x", "loud", output=io.StringIO(), env=UNDER_TTY)

    def test_is_silent_outside_the_adapter(self):
        out = io.StringIO()
        announce("Saved", output=out, env={})
        self.assertEqual(out.getvalue(), "")

    def test_keeps_control_characters_and_non_ascii_text_out_of_the_framing(self):
        out = io.StringIO()
        text = "bell\x07 escape\x1b newline\n 日本語 \U0001f50a"
        announce(text, output=out, env=UNDER_TTY)
        written = out.getvalue()
        # Exactly one start and one terminator: nothing inside the text can end the frame early.
        self.assertEqual(written.count(START), 1)
        self.assertEqual(written.count(BEL), 1)
        self.assertEqual(written.count("\x1b"), 1)
        self.assertTrue(written.isascii())
        self.assertEqual(frame_of(written)["text"], text)


class PublishSnapshotTest(unittest.TestCase):
    def test_carries_the_snapshot_untouched(self):
        snapshot = {
            "title": "Downloads",
            "nodes": [
                {"role": "heading", "value": "Queue"},
                {"role": "listbox", "label": "Queue", "children": [
                    {"role": "option", "label": "Song A", "selected": True, "focused": True},
                    {"role": "option", "label": "Song B"},
                ]},
                {"role": "progressbar", "label": "Progress", "valueNow": 42.5},
            ],
        }
        out = io.StringIO()
        publish_snapshot(snapshot, output=out, env=UNDER_TTY)
        self.assertEqual(frame_of(out.getvalue()), {"type": "a11y-snapshot", "snapshot": snapshot})


class PublishEventTest(unittest.TestCase):
    def test_with_and_without_a_payload(self):
        with_payload, without = io.StringIO(), io.StringIO()
        publish_event("open-file", {"accept": ".txt"}, output=with_payload, env=UNDER_TTY)
        publish_event("open-file", output=without, env=UNDER_TTY)
        self.assertEqual(frame_of(with_payload.getvalue()), {"type": "event", "name": "open-file", "payload": {"accept": ".txt"}})
        self.assertEqual(frame_of(without.getvalue()), {"type": "event", "name": "open-file"})


class PublishAppMessageTest(unittest.TestCase):
    def test_refuses_what_a_program_may_not_say(self):
        for message in ({"type": "output", "data": "x"}, {"type": "hello", "version": 1}, {"type": "commands", "commands": []}, {}):
            with self.assertRaises(ValueError):
                publish_app_message(message, output=io.StringIO(), env=UNDER_TTY)

    def test_checks_even_outside_the_adapter_so_mistakes_show_in_development(self):
        with self.assertRaises(ValueError):
            publish_app_message({"type": "output", "data": "x"}, output=io.StringIO(), env={})

    def test_refuses_a_message_too_large_to_send(self):
        out = io.StringIO()
        with self.assertRaises(ValueError):
            announce("x" * 1_000_001, output=out, env=UNDER_TTY)
        self.assertEqual(out.getvalue(), "")


if __name__ == "__main__":
    unittest.main()
