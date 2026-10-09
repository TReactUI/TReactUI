package bridge

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/meta-tui/treactui/packages/tty-go/protocol"
	"github.com/meta-tui/treactui/packages/tty-go/session"
)

// fakeEvents is the host's event bus, with the page played by the test.
type fakeEvents struct {
	mu       sync.Mutex
	handlers map[string][]func(string)
	down     []message
}

func newFakeEvents() *fakeEvents { return &fakeEvents{handlers: map[string][]func(string){}} }

func (f *fakeEvents) On(name string, handler func(string)) func() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.handlers[name] = append(f.handlers[name], handler)
	return func() {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.handlers[name] = nil
	}
}

func (f *fakeEvents) Emit(_ string, data string) {
	var m message
	if json.Unmarshal([]byte(data), &m) != nil {
		return
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.down = append(f.down, m)
}

// up plays the page: it emits an "up" event.
func (f *fakeEvents) up(m message) {
	data, _ := json.Marshal(m)
	f.mu.Lock()
	handlers := append([]func(string){}, f.handlers["treactui:up"]...)
	f.mu.Unlock()
	for _, h := range handlers {
		h(string(data))
	}
}

func (f *fakeEvents) downFor(conn string) []message {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []message
	for _, m := range f.down {
		if m.Conn == conn {
			out = append(out, m)
		}
	}
	return out
}

func (f *fakeEvents) downCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.down)
}

func (f *fakeEvents) handlerCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.handlers["treactui:up"])
}

func eventually(t *testing.T, what string, ok func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if ok() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

func clientFrame(t *testing.T, m protocol.ClientMessage) string {
	t.Helper()
	data, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// escapes matches the control sequences a terminal acts on, so the text the screen shows can be read.
var escapes = regexp.MustCompile(`\x1b\[[0-9;?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(\x07|\x1b\\)|\x1b[()][0-9A-B]`)

// outputOf is what the program has drawn so far, as plain text: Bubble Tea redraws only
// what changed, so a test reads the stream with the control sequences taken out.
func outputOf(messages []message) string {
	var b strings.Builder
	for _, m := range messages {
		if m.Kind != kindFrame {
			continue
		}
		var frame struct {
			Type string `json:"type"`
			Data string `json:"data"`
		}
		if json.Unmarshal([]byte(m.Frame), &frame) == nil && frame.Type == "output" {
			b.WriteString(frame.Data)
		}
	}
	return escapes.ReplaceAllString(b.String(), "")
}

type echo struct{ typed string }

func (e echo) Init() tea.Cmd  { return nil }
func (e echo) View() tea.View { return tea.NewView("typed:" + e.typed) }
func (e echo) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if key, ok := msg.(tea.KeyPressMsg); ok {
		if key.String() == "ctrl+c" {
			return e, tea.Quit
		}
		e.typed += key.String()
	}
	return e, nil
}

func TestEachServesAPageWhoseEventsArriveOutOfOrder(t *testing.T) {
	events := newFakeEvents()
	stop := Each(context.Background(), func() tea.Model { return echo{} }, events, Options{})
	defer stop()

	// The page sent open, a resize and two keys, in that order; the host delivers them shuffled.
	resize := clientFrame(t, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	for _, m := range []message{
		{Conn: "a", Seq: 3, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "input", Data: "b"})},
		{Conn: "a", Seq: 1, Kind: kindFrame, Frame: resize},
		{Conn: "a", Seq: 0, Kind: kindOpen},
		{Conn: "a", Seq: 2, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "input", Data: "a"})},
	} {
		events.up(m)
	}

	eventually(t, "the program to show what was typed, in order", func() bool {
		return strings.Contains(outputOf(events.downFor("a")), "typed:ab")
	})
	down := events.downFor("a")
	if down[0].Kind != kindFrame || !strings.Contains(down[0].Frame, `"hello"`) {
		t.Errorf("the first thing the page gets is the hello frame, got %+v", down[0])
	}
	for i, m := range down {
		if m.Seq != i {
			t.Fatalf("the page's messages are numbered from 0 in order, message %d has %d", i, m.Seq)
		}
	}
}

func TestANewConnectionReplacesTheOldOne(t *testing.T) {
	events := newFakeEvents()
	stop := Each(context.Background(), func() tea.Model { return echo{} }, events, Options{})
	defer stop()
	resize := clientFrame(t, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})

	events.up(message{Conn: "old", Seq: 0, Kind: kindOpen})
	events.up(message{Conn: "old", Seq: 1, Kind: kindFrame, Frame: resize})
	eventually(t, "the first page to be served", func() bool { return len(events.downFor("old")) > 1 })

	events.up(message{Conn: "new", Seq: 0, Kind: kindOpen})
	events.up(message{Conn: "new", Seq: 1, Kind: kindFrame, Frame: resize})
	eventually(t, "the reloaded page to be served", func() bool { return len(events.downFor("new")) > 1 })

	before := len(events.downFor("old"))
	events.up(message{Conn: "old", Seq: 2, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "input", Data: "x"})})
	events.up(message{Conn: "new", Seq: 2, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "input", Data: "y"})})
	eventually(t, "the new page to get its key", func() bool { return strings.Contains(outputOf(events.downFor("new")), "typed:y") })
	if after := len(events.downFor("old")); after != before {
		t.Errorf("the replaced page must hear nothing more, but got %d more messages", after-before)
	}
}

func TestThePageIsToldWhenTheProgramEnds(t *testing.T) {
	events := newFakeEvents()
	stop := Each(context.Background(), func() tea.Model { return echo{} }, events, Options{})
	defer stop()

	events.up(message{Conn: "a", Seq: 0, Kind: kindOpen})
	events.up(message{Conn: "a", Seq: 1, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})})
	events.up(message{Conn: "a", Seq: 2, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "input", Data: "\x03"})})

	eventually(t, "the close message", func() bool {
		down := events.downFor("a")
		return len(down) > 0 && down[len(down)-1].Kind == kindClose
	})
}

func TestSharedKeepsTheProgramWhenThePageLeaves(t *testing.T) {
	events := newFakeEvents()
	shared := session.NewSharedProgram(func() tea.Model { return echo{} })
	stop := Shared(context.Background(), shared, events, Options{})
	defer stop()
	resize := clientFrame(t, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})

	events.up(message{Conn: "a", Seq: 0, Kind: kindOpen})
	events.up(message{Conn: "a", Seq: 1, Kind: kindFrame, Frame: resize})
	events.up(message{Conn: "a", Seq: 2, Kind: kindFrame, Frame: clientFrame(t, protocol.ClientMessage{Type: "input", Data: "k"})})
	eventually(t, "the typed key", func() bool { return strings.Contains(outputOf(events.downFor("a")), "typed:k") })
	events.up(message{Conn: "a", Seq: 3, Kind: kindClose})

	// A reload: the page connects again and finds the program as it was.
	events.up(message{Conn: "b", Seq: 0, Kind: kindOpen})
	events.up(message{Conn: "b", Seq: 1, Kind: kindFrame, Frame: resize})
	eventually(t, "the program as it was", func() bool { return strings.Contains(outputOf(events.downFor("b")), "typed:k") })
}

func TestTheOptionsNameTheEventsAndStopUnbinds(t *testing.T) {
	if (Options{}).upEvent() != "treactui:up" || (Options{Prefix: "mvd"}).downEvent() != "mvd:down" {
		t.Errorf("unexpected event names %q %q", (Options{}).upEvent(), (Options{Prefix: "mvd"}).downEvent())
	}

	events := newFakeEvents()
	stop := Each(context.Background(), func() tea.Model { return echo{} }, events, Options{})
	if events.handlerCount() != 1 {
		t.Fatal("binding listens for the page's events")
	}
	stop()
	eventually(t, "the listener to go", func() bool { return events.handlerCount() == 0 })
}

func TestMalformedEventsAreIgnored(t *testing.T) {
	events := newFakeEvents()
	stop := Each(context.Background(), func() tea.Model { return echo{} }, events, Options{})
	defer stop()

	events.mu.Lock()
	handlers := append([]func(string){}, events.handlers["treactui:up"]...)
	events.mu.Unlock()
	for _, h := range handlers {
		h("not json")
		h(`{"n":0,"t":"open"}`) // no connection id
	}
	time.Sleep(50 * time.Millisecond)
	if events.downCount() != 0 {
		t.Errorf("nothing should be served for garbage, got %d messages", events.downCount())
	}
}
