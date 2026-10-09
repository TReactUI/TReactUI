package session

import (
	"strconv"
	"strings"
)

// modeTracker follows the terminal modes a program switches on and off by
// writing DEC private mode sequences (ESC [ ? n h and ESC [ ? n l): the
// alternate screen, mouse reporting, bracketed paste, cursor visibility and so
// on. A Bubble Tea v2 program asks for these from its View, and can change them
// at any time, so a browser that joins late has to be told which ones are on
// now. The tracker keeps the order in which modes were set so the replay is
// stable.
type modeTracker struct {
	on      map[int]bool
	order   []int
	pending []byte // an escape sequence cut in half by a write boundary
}

func newModeTracker() *modeTracker { return &modeTracker{on: map[int]bool{}} }

// maxSequence bounds how much of an unfinished escape sequence is kept.
const maxSequence = 64

// feed reads a chunk of the program's output.
func (t *modeTracker) feed(p []byte) {
	data := append(t.pending, p...)
	t.pending = nil
	for i := 0; i < len(data); i++ {
		if data[i] != 0x1b {
			continue
		}
		end, complete := sequenceEnd(data[i:])
		if !complete {
			if len(data)-i <= maxSequence {
				t.pending = append([]byte(nil), data[i:]...)
			}
			return
		}
		t.apply(data[i : i+end])
		i += end - 1
	}
}

// sequenceEnd returns the length of the CSI sequence at the start of s, and
// false when s ends before the sequence does. Anything that is not a CSI
// sequence counts as complete with length 1, so scanning moves on.
func sequenceEnd(s []byte) (int, bool) {
	if len(s) < 2 {
		return 0, false
	}
	if s[1] != '[' {
		return 1, true
	}
	for i := 2; i < len(s); i++ {
		if s[i] >= 0x40 && s[i] <= 0x7e {
			return i + 1, true
		}
	}
	return 0, false
}

// apply handles one complete CSI sequence.
func (t *modeTracker) apply(seq []byte) {
	if len(seq) < 5 || seq[2] != '?' {
		return
	}
	final := seq[len(seq)-1]
	if final != 'h' && final != 'l' {
		return
	}
	for _, field := range strings.Split(string(seq[3:len(seq)-1]), ";") {
		mode, err := strconv.Atoi(field)
		if err != nil {
			continue
		}
		t.set(mode, final == 'h')
	}
}

func (t *modeTracker) set(mode int, enabled bool) {
	if _, seen := t.on[mode]; !seen {
		t.order = append(t.order, mode)
	}
	t.on[mode] = enabled
}

// replay is the output that puts a fresh terminal into the modes now on.
func (t *modeTracker) replay() string {
	var b strings.Builder
	for _, mode := range t.order {
		if t.on[mode] {
			b.WriteString("\x1b[?" + strconv.Itoa(mode) + "h")
		}
	}
	return b.String()
}
