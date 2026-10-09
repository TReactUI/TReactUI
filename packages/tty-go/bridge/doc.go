// Package bridge carries a session over named events instead of a WebSocket, for a host that
// shows the page itself and has an event bus between the page and Go (a Wails window, for
// instance). No server, port or Origin check is involved: the page and the program talk
// through the host.
//
// The host passes its own event functions through Events, so this package depends on no
// desktop framework. Two events carry everything, "<prefix>:up" (page to Go) and
// "<prefix>:down" (Go to page); each holds a JSON message with the connection's id and a
// sequence number, because a host may deliver events out of order (Wails handles each event
// from the page in a goroutine of its own).
package bridge
