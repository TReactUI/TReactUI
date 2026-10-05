// Package session runs one Bubble Tea program for one browser connection.
package session

import "context"

// Transport carries text frames to and from the browser. The WebSocket
// adapter implements it; tests use an in-memory one.
type Transport interface {
	Read(ctx context.Context) ([]byte, error)
	Write(ctx context.Context, frame []byte) error
}
