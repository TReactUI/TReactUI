package session

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/TReactUI/TReactUI/packages/tty-go/protocol"
)

func send(t *testing.T, tr *memoryTransport, msg protocol.ClientMessage) {
	t.Helper()
	frame, _ := json.Marshal(msg)
	tr.incoming <- frame
}

func waitFor(t *testing.T, tr *memoryTransport, text string) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !strings.Contains(strings.Join(tr.frames(), "\n"), text) {
		if time.Now().After(deadline) {
			t.Fatalf("%q never arrived; frames: %v", text, tr.frames())
		}
		time.Sleep(20 * time.Millisecond)
	}
}

func attach(shared *SharedProgram, tr *memoryTransport) (cancel func(), done chan error) {
	ctx, cancel := context.WithCancel(context.Background())
	done = make(chan error, 1)
	go func() { done <- shared.Attach(ctx, tr) }()
	return cancel, done
}

func TestSharedProgramShowsABrowserThatJoinsLateTheCurrentScreen(t *testing.T) {
	shared := NewSharedProgram(func() tea.Model { return echo{} })
	first := &memoryTransport{incoming: make(chan []byte, 8)}
	cancelFirst, _ := attach(shared, first)
	defer cancelFirst()
	send(t, first, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	send(t, first, protocol.ClientMessage{Type: "input", Data: "a"})
	waitFor(t, first, "typed:a")

	second := &memoryTransport{incoming: make(chan []byte, 8)}
	cancelSecond, _ := attach(shared, second)
	defer cancelSecond()
	waitFor(t, second, "typed:a")
	all := strings.Join(second.frames(), "\n")
	if !strings.Contains(all, `"type":"hello"`) || !strings.Contains(all, `"type":"a11y-snapshot"`) {
		t.Fatalf("a late browser should get hello and the current snapshot: %v", second.frames())
	}

	send(t, second, protocol.ClientMessage{Type: "input", Data: "b"})
	waitFor(t, first, "typed:ab")
	waitFor(t, second, "typed:ab")
}

func TestSharedProgramKeepsRunningWhenEveryBrowserLeaves(t *testing.T) {
	shared := NewSharedProgram(func() tea.Model { return echo{} })
	first := &memoryTransport{incoming: make(chan []byte, 8)}
	cancelFirst, done := attach(shared, first)
	send(t, first, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	send(t, first, protocol.ClientMessage{Type: "input", Data: "a"})
	waitFor(t, first, "typed:a")

	cancelFirst()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("Attach did not return when the browser left")
	}

	again := &memoryTransport{incoming: make(chan []byte, 8)}
	cancelAgain, _ := attach(shared, again)
	defer cancelAgain()
	send(t, again, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	waitFor(t, again, "typed:a")
}

func TestSharedProgramStartsANewOneAfterTheProgramQuits(t *testing.T) {
	shared := NewSharedProgram(func() tea.Model { return echo{} })
	first := &memoryTransport{incoming: make(chan []byte, 8)}
	_, done := attach(shared, first)
	send(t, first, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	send(t, first, protocol.ClientMessage{Type: "input", Data: "a"})
	waitFor(t, first, "typed:a")

	send(t, first, protocol.ClientMessage{Type: "input", Data: "\x03"})
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("Attach did not return after the program quit")
	}

	fresh := &memoryTransport{incoming: make(chan []byte, 8)}
	cancelFresh, _ := attach(shared, fresh)
	defer cancelFresh()
	send(t, fresh, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	send(t, fresh, protocol.ClientMessage{Type: "input", Data: "z"})
	waitFor(t, fresh, "typed:z")
	if strings.Contains(strings.Join(fresh.frames(), "\n"), "typed:a") {
		t.Error("a new program should not remember the old one")
	}
}
