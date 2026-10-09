package session

import (
	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/colorprofile"
)

// programOptions are what every served program is started with. A browser is
// not a TTY, so left alone Bubble Tea would detect no colour support and strip
// every style: tell it the page is an xterm.js terminal with true colour.
func programOptions(size *windowSize) []tea.ProgramOption {
	return []tea.ProgramOption{
		tea.WithColorProfile(colorprofile.TrueColor),
		tea.WithEnvironment([]string{"TERM=xterm-256color", "COLORTERM=truecolor"}),
		tea.WithoutSignalHandler(),
		tea.WithFilter(size.filter),
	}
}
