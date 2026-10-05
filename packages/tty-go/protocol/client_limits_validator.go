package protocol

import (
	"fmt"
	"strings"
)

// The limits on what a browser may send, the same as @treactui/protocol enforces.
// A terminal larger than maxCells is a mistake or an attack, not a screen; a run
// message becomes a process command line, so it is bounded and free of NUL.
const (
	maxCells         = 1000
	maxCommandLength = 200
	maxArgs          = 100
	maxArgLength     = 10_000
)

func validCells(n int) bool { return n >= 1 && n <= maxCells }

func validCommandLinePart(s string, maxLength int) bool {
	return len(s) <= maxLength && !strings.ContainsRune(s, 0)
}

func validateRun(msg ClientMessage) error {
	valid := msg.Command != "" && validCommandLinePart(msg.Command, maxCommandLength) && len(msg.Args) <= maxArgs
	for _, arg := range msg.Args {
		valid = valid && validCommandLinePart(arg, maxArgLength)
	}
	if !valid {
		return fmt.Errorf("run needs a command and up to %d string arguments without NUL", maxArgs)
	}
	return nil
}
