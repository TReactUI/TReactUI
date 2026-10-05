"""Speak to the page from a program that @treactui/tty is serving.

A served program cannot call the adapter, so it writes a message on its own
output, inside a private-use terminal sequence the adapter removes before the text
reaches the browser:

    ESC ] 7770 ; <json> BEL

Outside the adapter (a normal terminal, a pipe, a test) every function here does
nothing, so the same program works everywhere.
"""

import json
import os
import sys
from typing import Any, Mapping, Optional, TextIO

from .a11y_snapshot_contract import A11ySnapshot

# The adapter sets this to "1" in the environment of the program it runs.
APP_CHANNEL_ENV = "TREACT_TTY"

_START = "\x1b]7770;"
_BEL = "\x07"

# A longer message is not a snapshot: the adapter passes its text through instead of buffering it.
_MAX_MESSAGE_LENGTH = 1_000_000

# What a program may say. Terminal output travels as `output`, and `hello` is the adapter's own.
_PUBLISHABLE_TYPES = frozenset({"a11y-snapshot", "announce", "event"})
_POLITENESS = frozenset({"polite", "assertive"})


def is_running_under_tty(env: Optional[Mapping[str, str]] = None) -> bool:
    """True when the program runs under the adapter."""
    return (os.environ if env is None else env).get(APP_CHANNEL_ENV) == "1"


def publish_app_message(
    message: Mapping[str, Any],
    output: Optional[TextIO] = None,
    env: Optional[Mapping[str, str]] = None,
) -> None:
    """Sends a protocol message (``a11y-snapshot``, ``announce`` or ``event``) to the browser.

    Raises ``ValueError`` for any other type, or for a message too large to send.
    The checks run even outside the adapter, so a mistake shows up in development.
    """
    message_type = message.get("type")
    if message_type not in _PUBLISHABLE_TYPES:
        raise ValueError(f"a program can publish {sorted(_PUBLISHABLE_TYPES)}, not {message_type!r}")

    # ASCII-only JSON is still valid JSON, and survives a console that is not UTF-8.
    body = json.dumps(message, separators=(",", ":"), ensure_ascii=True)
    if len(body) > _MAX_MESSAGE_LENGTH:
        raise ValueError(f"message is {len(body)} characters; the limit is {_MAX_MESSAGE_LENGTH}")

    if not is_running_under_tty(env):
        return
    stream = sys.stdout if output is None else output
    stream.write(_START + body + _BEL)
    stream.flush()


def announce(
    text: str,
    politeness: str = "polite",
    output: Optional[TextIO] = None,
    env: Optional[Mapping[str, str]] = None,
) -> None:
    """Makes screen readers read ``text`` aloud. ``politeness`` is ``"polite"`` or ``"assertive"``."""
    if politeness not in _POLITENESS:
        raise ValueError(f"politeness must be one of {sorted(_POLITENESS)}, not {politeness!r}")
    publish_app_message({"type": "announce", "text": text, "politeness": politeness}, output, env)


def publish_snapshot(
    snapshot: A11ySnapshot,
    output: Optional[TextIO] = None,
    env: Optional[Mapping[str, str]] = None,
) -> None:
    """Describes the current screen for assistive technology."""
    publish_app_message({"type": "a11y-snapshot", "snapshot": snapshot}, output, env)


def publish_event(
    name: str,
    payload: Any = None,
    output: Optional[TextIO] = None,
    env: Optional[Mapping[str, str]] = None,
) -> None:
    """Tells the host page something happened, such as a web-only action. ``payload`` is optional JSON."""
    message: dict = {"type": "event", "name": name}
    if payload is not None:
        message["payload"] = payload
    publish_app_message(message, output, env)
