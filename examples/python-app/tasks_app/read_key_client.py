"""Reads one key press from the terminal, the same way on Windows and on Unix.

It returns what a terminal would send (an arrow key is `ESC [ A`), so `parse_key` needs to know one form only.
The Windows path is exercised by the `treactui` demo; the Unix path is the standard `termios` one and has not
been run as part of this example's tests.
"""

import os
import sys
from contextlib import contextmanager
from typing import Iterator

# What the Windows console reports for an arrow key: a prefix, then a code.
_WINDOWS_ARROWS = {"H": "\x1b[A", "P": "\x1b[B"}


@contextmanager
def raw_terminal() -> Iterator[None]:
    """Keys arrive one at a time, without waiting for Enter and without being echoed."""
    if os.name == "nt":
        yield
        return

    import termios
    import tty

    descriptor = sys.stdin.fileno()
    saved = termios.tcgetattr(descriptor)
    try:
        tty.setcbreak(descriptor)
        yield
    finally:
        termios.tcsetattr(descriptor, termios.TCSADRAIN, saved)


def read_key() -> str:
    """Blocks until a key is pressed; returns the characters the terminal sent for it."""
    if os.name == "nt":
        import msvcrt

        first = msvcrt.getwch()
        if first in ("\x00", "\xe0"):
            return _WINDOWS_ARROWS.get(msvcrt.getwch(), "")
        sequence = first
        # A terminal that sends escape sequences as plain characters: take the rest of the sequence.
        while sequence.startswith("\x1b") and msvcrt.kbhit():
            sequence += msvcrt.getwch()
        return sequence

    return os.read(sys.stdin.fileno(), 8).decode(errors="ignore")
