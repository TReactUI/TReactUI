// Package socket serves a session over a WebSocket.
package socket

import (
	"context"
	"net/http"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/coder/websocket"

	"github.com/TReactUI/TReactUI/packages/tty-go/session"
)

// Options configures the WebSocket endpoint.
type Options struct {
	// AllowedOrigins lists extra Origin host patterns (for example
	// "localhost:5173") allowed to connect. By default only the page served
	// from the same host may connect: the endpoint runs a program, so a
	// foreign page must not be able to open it.
	AllowedOrigins []string
	// Mouse turns mouse reporting on, so the program receives tea.MouseMsg.
	Mouse bool
}

// Handler upgrades each request to a WebSocket and runs a fresh program on it.
func Handler(newModel func() tea.Model, options Options) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: options.AllowedOrigins})
		if err != nil {
			return
		}
		defer func() { _ = conn.CloseNow() }()
		var sessionOptions []session.Option
		if options.Mouse {
			sessionOptions = append(sessionOptions, session.WithMouse())
		}
		_ = session.Run(r.Context(), webSocketTransport{conn}, newModel, sessionOptions...)
		_ = conn.Close(websocket.StatusNormalClosure, "")
	})
}

type webSocketTransport struct{ conn *websocket.Conn }

func (t webSocketTransport) Read(ctx context.Context) ([]byte, error) {
	_, frame, err := t.conn.Read(ctx)
	return frame, err
}

func (t webSocketTransport) Write(ctx context.Context, frame []byte) error {
	return t.conn.Write(ctx, websocket.MessageText, frame)
}
