package session

import (
	"sync"

	tea "charm.land/bubbletea/v2"
)

// windowSize remembers the size the browser last reported.
//
// Bubble Tea v2 sends its own WindowSizeMsg when a program starts, from a
// goroutine, and with no terminal behind it the size is 0x0. That message can
// land after the browser's real size and wipe it out, leaving a blank screen.
// Passing every WindowSizeMsg through filter makes both carry the latest
// reported size, whichever order they arrive in.
type windowSize struct {
	mu   sync.Mutex
	size *tea.WindowSizeMsg
}

func (w *windowSize) set(size tea.WindowSizeMsg) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.size = &size
}

// get returns the latest size the browser reported, if any.
func (w *windowSize) get() (tea.WindowSizeMsg, bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.size == nil {
		return tea.WindowSizeMsg{}, false
	}
	return *w.size, true
}

// filter is a tea.WithFilter function.
func (w *windowSize) filter(_ tea.Model, msg tea.Msg) tea.Msg {
	if _, ok := msg.(tea.WindowSizeMsg); ok {
		if latest, known := w.get(); known {
			return latest
		}
	}
	return msg
}
