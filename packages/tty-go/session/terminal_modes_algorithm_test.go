package session

import "testing"

func TestTrackerReplaysTheModesThatAreOn(t *testing.T) {
	tr := newModeTracker()
	tr.feed([]byte("hello \x1b[?25l\x1b[?2004h\x1b[?1049h\x1b[?1003h\x1b[?1006h text"))
	tr.feed([]byte("\x1b[?1003l")) // mouse reporting off again
	got := tr.replay()
	want := "\x1b[?2004h\x1b[?1049h\x1b[?1006h"
	if got != want {
		t.Fatalf("replay = %q, want %q", got, want)
	}
}

func TestTrackerHandlesSequencesSplitAcrossWrites(t *testing.T) {
	tr := newModeTracker()
	tr.feed([]byte("abc\x1b[?10"))
	tr.feed([]byte("03h more"))
	if got := tr.replay(); got != "\x1b[?1003h" {
		t.Fatalf("replay = %q", got)
	}
}

func TestTrackerHandlesSeveralModesInOneSequence(t *testing.T) {
	tr := newModeTracker()
	tr.feed([]byte("\x1b[?1003;1006h\x1b[?1003l"))
	if got := tr.replay(); got != "\x1b[?1006h" {
		t.Fatalf("replay = %q", got)
	}
}

func TestTrackerIgnoresOtherSequencesAndGarbage(t *testing.T) {
	tr := newModeTracker()
	tr.feed([]byte("\x1b[31mred\x1b[0m\x1b]0;title\x07\x1b[2J\x1b[?x\x1b[?h\x1b"))
	if got := tr.replay(); got != "" {
		t.Fatalf("replay = %q", got)
	}
}

func TestTrackerDropsAnUnfinishedSequenceThatNeverEnds(t *testing.T) {
	tr := newModeTracker()
	long := make([]byte, 200)
	for i := range long {
		long[i] = ';'
	}
	tr.feed(append([]byte("\x1b[?"), long...))
	if len(tr.pending) != 0 {
		t.Fatalf("pending grew to %d bytes", len(tr.pending))
	}
}
