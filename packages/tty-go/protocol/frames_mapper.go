package protocol

import (
	"encoding/json"
	"fmt"
)

// NewHelloFrame announces the protocol version.
func NewHelloFrame() ServerFrame { return ServerFrame{Type: "hello", Version: Version} }

// NewOutputFrame carries terminal output.
func NewOutputFrame(data string) ServerFrame { return ServerFrame{Type: "output", Data: data} }

// NewSnapshotFrame carries an accessibility snapshot. A nil Nodes becomes an
// empty list, because the browser requires an array.
func NewSnapshotFrame(snapshot Snapshot) ServerFrame {
	if snapshot.Nodes == nil {
		snapshot.Nodes = []A11yNode{}
	}
	return ServerFrame{Type: "a11y-snapshot", Snapshot: &snapshot}
}

// NewAnnounceFrame carries a screen-reader announcement.
func NewAnnounceFrame(msg AnnounceMsg) ServerFrame {
	politeness := "polite"
	if msg.Assertive {
		politeness = "assertive"
	}
	return ServerFrame{Type: "announce", Text: msg.Text, Politeness: politeness}
}

// NewEventFrame carries a web-only action for the host page.
func NewEventFrame(msg EventMsg) ServerFrame {
	return ServerFrame{Type: "event", Name: msg.Name, Payload: msg.Payload}
}

// EncodeServerFrame serialises a frame into the text sent over the socket.
func EncodeServerFrame(frame ServerFrame) ([]byte, error) {
	return json.Marshal(frame)
}

// DecodeClientMessage accepts a text frame only when it is a well-formed
// client message, and says why otherwise.
func DecodeClientMessage(frame []byte) (ClientMessage, error) {
	var msg ClientMessage
	if err := json.Unmarshal(frame, &msg); err != nil {
		return ClientMessage{}, fmt.Errorf("frame is not valid JSON: %w", err)
	}
	switch msg.Type {
	case "input", "resize":
		return msg, nil
	default:
		return ClientMessage{}, fmt.Errorf("unknown message type %q", msg.Type)
	}
}
