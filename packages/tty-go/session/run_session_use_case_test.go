package session

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/TReactUI/TReactUI/packages/tty-go/protocol"
)

type memoryTransport struct {
	incoming chan []byte
	mu       sync.Mutex
	sent     []string
}

func (m *memoryTransport) Read(ctx context.Context) ([]byte, error) {
	select {
	case frame, ok := <-m.incoming:
		if !ok {
			return nil, errors.New("closed")
		}
		return frame, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (m *memoryTransport) Write(_ context.Context, frame []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sent = append(m.sent, string(frame))
	return nil
}

func (m *memoryTransport) frames() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]string(nil), m.sent...)
}

type echo struct{ typed string }

func (e echo) Init() tea.Cmd { return nil }
func (e echo) View() string  { return "typed:" + e.typed }
func (e echo) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if key, ok := msg.(tea.KeyMsg); ok {
		if key.Type == tea.KeyCtrlC {
			return e, tea.Quit
		}
		e.typed += key.String()
	}
	return e, nil
}
func (e echo) Accessible() protocol.Snapshot {
	return protocol.Snapshot{Title: "Echo", Nodes: []protocol.A11yNode{{Role: "text", Value: e.typed}}}
}

func TestRunStreamsOutputAndSnapshotsAndStopsWhenTheProgramQuits(t *testing.T) {
	transport := &memoryTransport{incoming: make(chan []byte, 8)}
	done := make(chan error, 1)
	go func() { done <- Run(context.Background(), transport, func() tea.Model { return echo{} }) }()

	resize, _ := json.Marshal(protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	transport.incoming <- resize
	typed, _ := json.Marshal(protocol.ClientMessage{Type: "input", Data: "a"})
	transport.incoming <- typed

	deadline := time.Now().Add(5 * time.Second)
	for !strings.Contains(strings.Join(transport.frames(), "\n"), "typed:a") {
		if time.Now().After(deadline) {
			t.Fatalf("output never arrived; frames: %v", transport.frames())
		}
		time.Sleep(20 * time.Millisecond)
	}

	all := strings.Join(transport.frames(), "\n")
	if !strings.Contains(all, `"type":"hello"`) || !strings.Contains(all, `"type":"a11y-snapshot"`) {
		t.Fatalf("missing hello or snapshot frame: %v", transport.frames())
	}

	quit, _ := json.Marshal(protocol.ClientMessage{Type: "input", Data: "\x03"})
	transport.incoming <- quit
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("Run did not return after the program quit")
	}
}
