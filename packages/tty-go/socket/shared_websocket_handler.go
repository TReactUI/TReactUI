package socket

import (
	"net/http"

	"github.com/coder/websocket"

	"github.com/TReactUI/TReactUI/packages/tty-go/session"
)

// SharedHandler upgrades each request to a WebSocket and attaches it to the one
// shared program, so every connection sees and drives the same screen.
func SharedHandler(shared *session.SharedProgram, options Options) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: options.AllowedOrigins})
		if err != nil {
			return
		}
		defer func() { _ = conn.CloseNow() }()
		_ = shared.Attach(r.Context(), webSocketTransport{conn})
		_ = conn.Close(websocket.StatusNormalClosure, "")
	})
}
