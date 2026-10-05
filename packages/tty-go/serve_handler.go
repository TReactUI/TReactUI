// Package ttygo serves a Bubble Tea program to the browser, for the
// @treactui/tty React component: the real terminal output, plus the semantic
// information assistive technology needs.
//
//	mux.Handle("/term", ttygo.Handler(func() tea.Model { return newModel() }, ttygo.Options{}))
//
// A model may implement Accessible to describe its screen; it may return
// AnnounceMsg or EventMsg from a command to speak to the page.
package ttygo

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"

	"net/http"

	"github.com/TReactUI/TReactUI/packages/tty-go/session"
	"github.com/TReactUI/TReactUI/packages/tty-go/socket"
)

// Options configures Handler.
type Options struct {
	// AllowedOrigins lists extra Origin host patterns allowed to connect,
	// for example "localhost:5173" during development.
	AllowedOrigins []string
}

// Handler serves a fresh program from newModel on every WebSocket connection.
//
// A browser is not a TTY, so Lipgloss would detect no colour support and
// strip every style. Handler therefore forces true colour, process-wide.
func Handler(newModel func() tea.Model, options Options) http.Handler {
	lipgloss.SetColorProfile(termenv.TrueColor)
	return socket.Handler(newModel, socket.Options{AllowedOrigins: options.AllowedOrigins})
}

// SharedHandler serves one program to every connection: they all see the same
// screen, anyone's keystrokes reach it, and it keeps running when every browser
// has left, so a reload or a second window finds it as it was. newModel is
// called when the first browser connects, and again for the first connection
// after the program quits. The screen has the size of the latest resize.
//
// Use it for an application with one user and one state (a tray app's window);
// use Handler when each browser should get its own program.
func SharedHandler(newModel func() tea.Model, options Options) http.Handler {
	lipgloss.SetColorProfile(termenv.TrueColor)
	return socket.SharedHandler(session.NewSharedProgram(newModel), socket.Options{AllowedOrigins: options.AllowedOrigins})
}
