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
	tea "charm.land/bubbletea/v2"
	"net/http"

	"github.com/meta-tui/treactui/packages/tty-go/session"
	"github.com/meta-tui/treactui/packages/tty-go/socket"
)

// Options configures Handler.
type Options struct {
	// AllowedOrigins lists extra Origin host patterns allowed to connect,
	// for example "localhost:5173" during development.
	AllowedOrigins []string
}

// Handler serves a fresh program from newModel on every WebSocket connection.
//
// A browser is not a TTY, so Bubble Tea would detect no colour support and
// strip every style. Each program is therefore started with true colour forced.
// Mouse reporting, the alternate screen and the rest are the program's own
// business: a Bubble Tea v2 model asks for them from its View, and the page's
// terminal follows.
func Handler(newModel func() tea.Model, options Options) http.Handler {
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
	return socket.SharedHandler(session.NewSharedProgram(newModel), socket.Options{AllowedOrigins: options.AllowedOrigins})
}
