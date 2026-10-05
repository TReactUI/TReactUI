package session

import tea "github.com/charmbracelet/bubbletea"

// mouseReporting is what Bubble Tea writes to turn on mouse reports (button
// presses, wheel and drags, in the SGR encoding). A browser that joins a program
// already running missed it.
const mouseReporting = "\x1b[?1002h\x1b[?1006h"

// Option changes how a session runs its program.
type Option func(*settings)

type settings struct{ mouse bool }

// WithMouse turns mouse reporting on, so the program receives tea.MouseMsg.
func WithMouse() Option { return func(s *settings) { s.mouse = true } }

func newSettings(options []Option) settings {
	var s settings
	for _, option := range options {
		option(&s)
	}
	return s
}

func (s settings) programOptions() []tea.ProgramOption {
	if s.mouse {
		return []tea.ProgramOption{tea.WithMouseCellMotion()}
	}
	return nil
}

// preamble is what a browser joining a running program needs before the first redraw.
func (s settings) preamble() string {
	if s.mouse {
		return terminalPreamble + mouseReporting
	}
	return terminalPreamble
}
