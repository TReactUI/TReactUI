"""Turns what a terminal sends for a key press into the name of the action it means."""

from typing import Optional

# Arrow keys arrive as a short escape sequence; some terminals use the application form (ESC O).
_KEYS = {
    "\x1b[A": "up",
    "\x1bOA": "up",
    "k": "up",
    "\x1b[B": "down",
    "\x1bOB": "down",
    "j": "down",
    " ": "toggle",
    "\r": "toggle",
    "\n": "toggle",
    "n": "add",
    "q": "quit",
    "\x03": "quit",  # Ctrl+C
}


def parse_key(sequence: str) -> Optional[str]:
    """``"up"``, ``"down"``, ``"toggle"``, ``"add"`` or ``"quit"``; ``None`` for a key the app ignores."""
    return _KEYS.get(sequence)
