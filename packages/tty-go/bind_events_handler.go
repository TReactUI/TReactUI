package ttygo

import (
	"context"

	tea "charm.land/bubbletea/v2"

	"github.com/meta-tui/treactui/packages/tty-go/bridge"
	"github.com/meta-tui/treactui/packages/tty-go/session"
)

// Events is the event bus a host offers between the page and Go, for Bind and BindShared:
// a desktop shell that shows the page itself (a Wails window, for example) and so needs no
// server, no port and no Origin check. The host passes its own functions; ttygo depends on
// no desktop framework.
type Events = bridge.Events

// BindOptions configures Bind and BindShared.
type BindOptions = bridge.Options

// SharedProgram is one program that every connection watches and types into (see
// SharedHandler), for a host that wants to keep hold of it: Send delivers a message to it.
type SharedProgram = session.SharedProgram

// NewSharedProgram prepares a shared program; newModel is called each time one starts.
func NewSharedProgram(newModel func() tea.Model) *SharedProgram {
	return session.NewSharedProgram(newModel)
}

// Bind serves a fresh program from newModel to every connection the page opens over events,
// like Handler does over a WebSocket. The page is `<TTY createSocket={createWailsSocket()} />`
// or any transport that speaks the same two events (see BindOptions.Prefix). The returned
// function unbinds.
func Bind(ctx context.Context, newModel func() tea.Model, events Events, options BindOptions) (stop func()) {
	return bridge.Each(ctx, newModel, events, options)
}

// BindShared serves one shared program to the page over events, like SharedHandler does over a
// WebSocket: it keeps running when the page leaves, so a reload finds it as it was. One page
// is served at a time, the latest to connect. The returned function unbinds.
func BindShared(ctx context.Context, shared *SharedProgram, events Events, options BindOptions) (stop func()) {
	return bridge.Shared(ctx, shared, events, options)
}
