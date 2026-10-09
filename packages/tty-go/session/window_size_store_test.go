package session

import (
	"testing"

	tea "charm.land/bubbletea/v2"
)

func TestFilterReplacesAnyWindowSizeWithTheLatestReported(t *testing.T) {
	var w windowSize
	// Nothing reported yet: pass the message through.
	if got := w.filter(nil, tea.WindowSizeMsg{Width: 0, Height: 0}); got != (tea.WindowSizeMsg{}) {
		t.Fatalf("got %v", got)
	}
	w.set(tea.WindowSizeMsg{Width: 80, Height: 24})
	// Bubble Tea's own stale 0x0 now carries the browser's size.
	if got := w.filter(nil, tea.WindowSizeMsg{}); got != (tea.WindowSizeMsg{Width: 80, Height: 24}) {
		t.Fatalf("got %v", got)
	}
	// Other messages are untouched.
	if got := w.filter(nil, "hello"); got != "hello" {
		t.Fatalf("got %v", got)
	}
}
